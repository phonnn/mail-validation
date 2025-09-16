#!/bin/bash
sudo docker compose -f ./docker-compose.yml -p mail-validation up -d --build --remove-orphans
