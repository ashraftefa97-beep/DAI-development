#include "dai_link.h"
#include <stdio.h>

size_t dai_link_encode(const dai_message_t *msg, char *out, size_t out_size) {
  if (!msg || !out || out_size == 0) return 0;
  int n = snprintf(out, out_size,
    "{\"v\":1,\"type\":%u,\"id\":%lu,\"text\":\"%s\"}",
    (unsigned)msg->type, (unsigned long)msg->request_id, msg->text);
  if (n < 0 || (size_t)n >= out_size) return 0;
  return (size_t)n;
}
