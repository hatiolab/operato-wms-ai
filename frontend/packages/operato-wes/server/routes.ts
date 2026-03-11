process.on('bootstrap-module-global-public-route' as any, (app, globalPublicRouter) => {
  /*
   * can add global public routes to application (auth not required, tenancy not required)
   *
   * ex) routes.get('/path', async(context, next) => {})
   * ex) routes.post('/path', async(context, next) => {})
   */
})

process.on('bootstrap-module-global-private-route' as any, (app, globalPrivateRouter) => {
  /*
   * can add global private routes to application (auth required, tenancy not required)
   */
})

process.on('bootstrap-module-domain-public-route' as any, (app, domainPublicRouter) => {
  /*
   * can add domain public routes to application (auth not required, tenancy required)
   */
})

process.on('bootstrap-module-domain-private-route' as any, (app, domainPrivateRouter) => {
  /*
   * can add domain private routes to application (auth required, tenancy required)
   */
})
