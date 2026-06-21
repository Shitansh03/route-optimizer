import { apiSlice } from '../api/apiSlice'

export const extractApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    extractFromText: builder.mutation({
      query: (rawText) => ({
        url: '/extract/text',
        method: 'POST',
        body: { rawText },
      }),
    }),

    autocomplete: builder.query({
      query: ({ q, lat, lng }) => {
        const p = new URLSearchParams({ q })
        if (lat) p.set('lat', lat)
        if (lng) p.set('lng', lng)
        return `/extract/autocomplete?${p}`
      },
    }),

    resolveEloc: builder.mutation({
      query: (eloc) => ({
        url: '/extract/resolve-eloc',
        method: 'POST',
        body: { eloc },
      }),
    }),

    geocodeSingle: builder.mutation({
      query: (input) => {
        const isString  = typeof input === 'string'
        const address   = isString ? input : (input?.address   ?? '')
        const biasLat   = isString ? undefined : (input?.biasLat ?? undefined)
        const biasLng   = isString ? undefined : (input?.biasLng ?? undefined)

        return {
          url:    '/extract/geocode-single',
          method: 'POST',
          body:   { address, biasLat, biasLng },
        }
      },
    }),

    geocodeBatch: builder.mutation({
      query: (addresses) => ({
        url:    '/extract/geocode-batch',
        method: 'POST',
        body:   { addresses },
      }),
    }),

    uploadRecording: builder.mutation({
      query: (formData) => ({
        url:      '/extract/recording',
        method:   'POST',
        body:     formData,
        formData: true,
      }),
    }),

  }),
  overrideExisting: true,
})

export const {
  useExtractFromTextMutation,
  useAutocompleteQuery,
  useResolveElocMutation,
  useGeocodeSingleMutation,
  useGeocodeBatchMutation,
  useUploadRecordingMutation,
} = extractApiSlice