export default async function route(page, module) {
  let route = (await module.routes)?.find(r => r.page == page)
  if (route) {
    return page
  }
}
