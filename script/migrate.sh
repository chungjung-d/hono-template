export DATABASE_URL=$(cat .migrate.env | grep DATABASE_URL | cut -d '=' -f 2)

bunx drizzle-kit generate

bunx drizzle-kit push
