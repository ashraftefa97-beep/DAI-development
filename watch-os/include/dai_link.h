#pragma once
#include <stddef.h>
#include <stdint.h>

#define DAI_LINK_MAX_TEXT 192

typedef enum {
  DAI_MSG_HELLO = 1,
  DAI_MSG_LISTEN_START,
  DAI_MSG_LISTEN_STOP,
  DAI_MSG_TRANSCRIPT,
  DAI_MSG_REPLY_TEXT,
  DAI_MSG_SPEECH_START,
  DAI_MSG_SPEECH_END,
  DAI_MSG_ERROR
} dai_msg_type_t;

typedef struct {
  dai_msg_type_t type;
  uint32_t request_id;
  char text[DAI_LINK_MAX_TEXT];
} dai_message_t;

size_t dai_link_encode(const dai_message_t *msg, char *out, size_t out_size);
