#!/bin/bash
set -e

mkdir -p /run/mysqld
chown -R mysql:mysql /run/mysqld /var/lib/mysql

if [ ! -d /var/lib/mysql/mysql ]; then
    mariadb-install-db --user=mysql --datadir=/var/lib/mysql >/dev/null 2>&1
fi

mysqld_safe --user=mysql --datadir=/var/lib/mysql --bind-address=127.0.0.1 >/dev/null 2>&1 &

for i in $(seq 1 60); do
    if mysqladmin ping >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

mysql -uroot <<'SQL'
CREATE DATABASE IF NOT EXISTS educar CHARACTER SET utf8 COLLATE utf8_general_ci;
CREATE USER IF NOT EXISTS 'educaruser'@'localhost' IDENTIFIED BY 'educarpass';
CREATE USER IF NOT EXISTS 'educaruser'@'127.0.0.1' IDENTIFIED BY 'educarpass';
GRANT ALL PRIVILEGES ON educar.* TO 'educaruser'@'localhost';
GRANT ALL PRIVILEGES ON educar.* TO 'educaruser'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

if [ "$(mysql -N -uroot -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='educar' AND table_name='estudiantes'")" = "0" ]; then
    mysql -uroot educar < /var/www/html/sql/Educar.sql
fi

exec apache2-foreground
