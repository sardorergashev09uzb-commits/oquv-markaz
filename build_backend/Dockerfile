FROM php:8.3-apache

# Kerakli kutubxonalarni o'rnatish
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql zip

# Apache mod_rewrite ni yoqish
RUN a2enmod rewrite

# Composer ni o'rnatish
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Kodlarni ko'chirish
COPY . .

# Composer orqali vendorlarni o'rnatish
RUN composer install --no-dev --optimize-autoloader

# Init command orqali production configs ni yaratish (agar kerak bo'lsa)
RUN php init --env=Production --overwrite=All || true

# Papka huquqlarini to'g'rilash
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/api/runtime /var/www/html/api/web/assets

# Apache DocumentRoot ni api/web ga to'g'rilash
ENV APACHE_DOCUMENT_ROOT /var/www/html/api/web

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Portni ochish (Render.com uchun odatda 80)
EXPOSE 80

CMD ["apache2-foreground"]
