
# variables
BACKEND_DIR=backend
FRONTEND_DIR=frontend
DB_DIR=$(BACKEND_DIR)/db

include $(BACKEND_DIR)/.env


# default target
.PHONY: help
help:
	@echo "Usage:"
	@echo "    make install           Install all dependencies (backend + frontend)"
	@echo "    make build             Build the React frontend"
	@echo "    make dev               Start backend + frontend dev servers concurrently"
	@echo "    make start             Start the backend server (serves built frontend)"
	@echo "    make db-start          Start mysql"
	@echo "    make db-create         Create the database and tables"
	@echo "    make db-seed           Insert initial seed data"
	@echo "    make db-dump           Dump the database"
	@echo "    make db-reset          Drop and recreate database"

install:
	@echo " [*] Installing backend dependencies"
	@cd $(BACKEND_DIR) && npm install
	@echo " [*] Installing frontend dependencies"
	@cd $(FRONTEND_DIR) && npm install

build:
	@echo " [*] Building React frontend"
	@cd $(FRONTEND_DIR) && npm run build

start:
	@echo ' [*] Starting Prod (backend serves built frontend on :8080)'
	@cd $(BACKEND_DIR) && npm start

dev:
	@echo ' [*] Starting Dev (backend :8080 + frontend :5173 with HMR)'
	@cd $(BACKEND_DIR) && npx concurrently \
	  --names "backend,frontend" \
	  --prefix-colors "blue,green" \
	  "npm run dev" \
	  "cd ../$(FRONTEND_DIR) && npm run dev"

mysql:
	@mysql -h $(DB_HOST) -u$(DB_USER) -p$(DB_PASS) $(DB_NAME)

db-create:
	@mysql -h $(DB_HOST) -u$(DB_USER) -p$(DB_PASS) < $(DB_DIR)/schema.sql
	@mysql -h $(DB_HOST) -u$(DB_USER) -p$(DB_PASS) $(DB_NAME) < $(DB_DIR)/views.sql
	@echo ' [*] Created database'

db-start:
	@service mysql start
	@echo ' [*] Started mysql'

db-seed:
	@echo "[*] Importing seed data..."
	@if [ -f "$(DB_DIR)/seed.sql" ]; then \
		mysql -h "$(DB_HOST)" -u"$(DB_USER)" -p"$(DB_PASS)" "$(DB_NAME)" < "$(DB_DIR)/seed.sql"; \
		echo "[*] Seed data imported."; \
	else \
		echo "[!] No seed.sql found at $(DB_DIR)/seed.sql."; \
	fi

db-dump:
	@mysqldump -h $(DB_HOST) -u$(DB_USER) -p$(DB_PASS) --databases $(DB_NAME) > $(DB_DIR)/dump.sql
	@echo ' [*] Dumped database'

db-reset:
	@echo "[*] Dropping and recreating database $(DB_NAME)..."
	@mysql -h $(DB_HOST) -u$(DB_USER) -p$(DB_PASS) -e "DROP DATABASE IF EXISTS $(DB_NAME);"
	@echo ' [*] Reset the database'
	@make db-create
	@make db-seed
