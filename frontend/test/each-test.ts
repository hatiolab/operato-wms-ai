import addClosest from 'element-closest'

import 'saddle-up/matchers'
import 'saddle-up/koa-matchers'
import './matchers'

if (typeof window !== 'undefined') {
  addClosest(window)
}

// eslint-disable-next-line jest/require-top-level-describe
afterEach(() => {})
