import { UPDATE_NOTIFICATION_TIMER } from '../actions/metapage'

const INITIAL_STATE = {
  notification : {
    notificationTimer : 5000
  }
}

const notificationTimer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case UPDATE_NOTIFICATION_TIMER:
      return {
        ...state,
        notification: {
          badge: action.notification.badge,
          history: action.notification.history,
          notificationTimer: action.notification.notificationTimer
        }
      }

    default:
      return state
  }
}

export default notificationTimer