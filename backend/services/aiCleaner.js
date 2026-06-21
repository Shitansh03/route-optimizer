async function cleanAddressesWithAI(rawText) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting addresses from raw OCR text.

The OCR text may come from:
- Delivery app screenshots (Field-X, EKL Last Mile, Amazon Flex, Delhivery, DTDC, Shadowfax, etc.)
- Photos of printed delivery sheets / manifests
- Excel or table screenshots
- WhatsApp messages or chats with addresses
- Any other source with address-like text

WHAT IS AN ADDRESS:
Anything that could be a physical location a person could visit. This includes:
- Full addresses with house number, street, city, PIN
- Partial addresses like "34, Nagpur" or "Mughal darbar restaurant mate chowk, Nagpur"
- Business names with city like "KC Overseas Education, Nagpur"
- Building/floor/room identifiers like "NPTI Executive Hostel C Room No.108, Nagpur"
- Any text containing a PIN code (6-digit number) — always treat as address

RULES:
1. Extract EVERY location/address fragment — be generous, not strict
2. Fix common OCR errors:
   - "rn" → "m" (e.g. "sencing" → "sensing", "restarent" → "restaurant")
   - "0" vs "O" confusion in PINs and addresses
   - "Nagpur" written as "NAGPUR" — normalize case
3. Remove duplicate addresses (keep only one copy)
4. Do NOT remove addresses just because they seem incomplete — include them
5. Do NOT include: names of people, phone numbers, order IDs, app button labels (like "OFD", "Delivered", "Pending"), dates, timestamps
6. A 6-digit PIN code next to city = definitely an address, always include it
7. Return ONLY valid JSON — no markdown, no explanation text

Return this exact JSON structure:
{
  "addresses": [
    {
      "raw": "text as it appeared (unchanged)",
      "cleaned": "best standardized version of this address",
      "confidence": "high|medium|low",
      "issues": "brief note on what was fixed or is missing, or empty string"
    }
  ],
  "totalFound": 5
}

Confidence guide:
- "high" = has street/area + city, ideally with PIN code
- "medium" = has area + city but missing PIN, OR has PIN but unclear street
- "low" = only city/locality or very incomplete, but still a location`
          },
          {
            role: 'user',
            content: `Extract ALL addresses and locations from this OCR text. Be generous — include anything that looks like it could be a delivery location:\n\n${rawText.substring(0, 8000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq API error: ${response.status} — ${err}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    const clean = content.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return parsed.addresses || []

  } catch (err) {
    console.error('AI Cleaner error:', err.message)
    return []
  }
}


function ruleBasedExtract(rawText) {
  const commonCities = [
    'nagpur', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai',
    'kolkata', 'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow',
    'kanpur', 'indore', 'bhopal', 'visakhapatnam', 'patna', 'vadodara',
    'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
    'rajkot', 'varanasi', 'aurangabad', 'amritsar', 'navi mumbai',
    'thane', 'noida', 'gurgaon', 'gurugram', 'chandigarh'
  ]

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 5)
  const addresses = []

  for (const line of lines) {
    const lower = line.toLowerCase()

    const hasPIN = /\b\d{6}\b/.test(line)

    const hasCity = commonCities.some(city => lower.includes(city))

    const hasNumber = /\d/.test(line)
    const hasWords = /[a-zA-Z]{3,}/.test(line)

    if ((hasPIN || hasCity) && hasWords) {
      addresses.push({
        raw: line,
        cleaned: line,
        confidence: hasPIN && hasCity ? 'high' : hasCity ? 'medium' : 'low',
        issues: hasPIN ? '' : 'Missing PIN code'
      })
    }
  }


  const seen = new Set()
  return addresses.filter(a => {
    const key = a.cleaned.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

module.exports = { cleanAddressesWithAI, ruleBasedExtract }