import { apiSlice } from '../api/apiSlice'

export const routesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    getMyRoutes: builder.query({
      query: () => '/routes/my-routes',
      providesTags: ['Routes'],
    }),

    getRouteById: builder.query({
      query: (id) => `/routes/${id}`,
      providesTags: (result, error, id) => [{ type: 'Routes', id }],
    }),

    createRoute: builder.mutation({
      query: (data) => ({
        url: '/routes/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Routes'],
    }),

    addStops: builder.mutation({
      query: ({ routeId, stops }) => ({
        url: `/routes/${routeId}/stops`,
        method: 'POST',
        body: { stops },
      }),
      invalidatesTags: (result, error, { routeId }) => [{ type: 'Routes', id: routeId }],
    }),

    updateStopStatus: builder.mutation({
      query: ({ routeId, stopId, status, note }) => ({
        url: `/routes/${routeId}/stops/${stopId}`,
        method: 'PUT',
        body: { status, note },
      }),
      invalidatesTags: (result, error, { routeId }) => [{ type: 'Routes', id: routeId }],
    }),

    setStartLocation: builder.mutation({
      query: ({ routeId, startLocation }) => ({
        url: `/routes/${routeId}/start-location`,
        method: 'PUT',
        body: { startLocation },
      }),
      invalidatesTags: (result, error, { routeId }) => [{ type: 'Routes', id: routeId }],
    }),

    startRoute: builder.mutation({
      query: (id) => ({
        url: `/routes/${id}/start`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Routes', id }],
    }),

    completeRoute: builder.mutation({
      query: (id) => ({
        url: `/routes/${id}/complete`,
        method: 'PUT',
      }),
      invalidatesTags: ['Routes'],
    }),

    deleteRoute: builder.mutation({
      query: (id) => ({
        url: `/routes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Routes'],
    }),

    optimizeRoute: builder.mutation({
      query: (routeId) => ({
        url: '/optimize',
        method: 'POST',
        body: { routeId },
      }),
      invalidatesTags: (result, error, routeId) => [{ type: 'Routes', id: routeId }],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetMyRoutesQuery,
  useGetRouteByIdQuery,
  useCreateRouteMutation,
  useAddStopsMutation,
  useUpdateStopStatusMutation,
  useSetStartLocationMutation,
  useStartRouteMutation,
  useCompleteRouteMutation,
  useDeleteRouteMutation,
  useOptimizeRouteMutation,
} = routesApiSlice