.PHONY: help build up down logs ps restart clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all services
	docker-compose build

build-backend: ## Build backend (includes frontend)
	docker-compose build backend

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs (all services)
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-db: ## Show database logs
	docker-compose logs -f database

ps: ## Show running services
	docker-compose ps

restart: ## Restart all services
	docker-compose restart

restart-backend: ## Restart backend
	docker-compose restart backend

clean: ## Stop and remove containers, networks, volumes
	docker-compose down -v
	docker system prune -f

shell-backend: ## Shell into backend container
	docker-compose exec backend sh

shell-db: ## Shell into database container
	docker-compose exec database psql -U $${POSTGRES_USER:-dayz_admin} -d dayz_tracker

health: ## Check health of all services
	@echo "Backend + Frontend:"
	@curl -f http://localhost/health || echo "Backend: DOWN"
	@echo "\nDatabase:"
	@docker-compose exec -T database pg_isready -U $${POSTGRES_USER:-dayz_admin} || echo "Database: DOWN"

migrate: ## Run database migrations
	docker-compose exec backend npx drizzle-kit push

dev: ## Start services for development
	docker-compose up

prod: build up ## Build and start for production

