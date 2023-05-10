build:
	docker build -t tgbot .

run:
	docker run -d -p 3333:3333 --name tgbot --rm tgbot