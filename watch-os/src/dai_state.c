#include "dai_state.h"

void dai_session_init(dai_session_t *s) {
  s->state = DAI_IDLE;
  s->request_id = 0;
  s->started_ms = 0;
}

void dai_session_set(dai_session_t *s, dai_state_t state, uint32_t now_ms) {
  if (state == DAI_LISTENING && s->state != DAI_LISTENING) s->request_id++;
  s->state = state;
  s->started_ms = now_ms;
}

const char *dai_state_name(dai_state_t state) {
  switch (state) {
    case DAI_IDLE: return "idle";
    case DAI_LISTENING: return "listening";
    case DAI_THINKING: return "thinking";
    case DAI_SPEAKING: return "speaking";
    case DAI_ERROR: return "error";
    default: return "unknown";
  }
}
