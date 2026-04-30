#!/usr/bin/env sh
set -eu

rabbitmqadmin declare exchange name=events.direct type=direct durable=true
rabbitmqadmin declare exchange name=events.fanout type=fanout durable=true
rabbitmqadmin declare exchange name=events.topic type=topic durable=true
rabbitmqadmin declare exchange name=events.dlx type=direct durable=true

rabbitmqadmin declare queue name=lifeline.retry durable=true arguments='{"x-dead-letter-exchange":"events.direct","x-message-ttl":30000}'
rabbitmqadmin declare queue name=lifeline.dlq durable=true
rabbitmqadmin declare binding source=events.dlx destination=lifeline.dlq routing_key=dead

rabbitmqadmin declare queue name=matching.emergency durable=true arguments='{"x-dead-letter-exchange":"events.dlx","x-dead-letter-routing-key":"dead"}'
rabbitmqadmin declare binding source=events.direct destination=matching.emergency routing_key=emergency.created
rabbitmqadmin declare queue name=inventory.reserve durable=true arguments='{"x-dead-letter-exchange":"events.dlx","x-dead-letter-routing-key":"dead"}'
rabbitmqadmin declare binding source=events.direct destination=inventory.reserve routing_key=inventory.reserve
rabbitmqadmin declare queue name=analytics.all durable=true
rabbitmqadmin declare binding source=events.fanout destination=analytics.all routing_key=
