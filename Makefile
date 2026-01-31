.PHONY: dev down reset restore

dev:
	docker-compose up -d database
	npm run db:push
	npm run dev

down:
	docker-compose down

reset:
	docker-compose down -v

restore:
	docker-compose up -d database
	docker cp backup.sql dayz-tracker-db:/tmp/backup.sql
	docker-compose exec -T database psql -U your_db_user -d dayz_tracker -f /tmp/backup.sql
