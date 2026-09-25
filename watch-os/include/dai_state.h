#pragma once
#include <stdint.h>

typedef enum {
  DAI_IDLE = 0,
  DAI_LISTENING,
  DAI_THINKING,
  DAI_SPEAKING,
  DAI_ERROR
} dai_state_t;

typedef struct {
  dai_state_t state;
  uint32_t request_id;
  uint32_t started_ms;
} dai_session_t;

void dai_session_init(dai_session_t *s);
void dai_session_set(dai_session_t *s, dai_state_t state, uint32_t now_ms);
const char *dai_state_name(dai_state_t state);
