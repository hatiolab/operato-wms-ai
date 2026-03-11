export default function route(page, module) {
  switch (page) {
    case 'system-home':
      import('./pages/system/system-home.js')
      return page
  }
}
