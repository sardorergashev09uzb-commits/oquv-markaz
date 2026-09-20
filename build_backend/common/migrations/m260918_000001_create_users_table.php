<?php

use yii\db\Migration;

/**
 * Migration: users va user_tokens jadvallari
 */
class m260918_000001_create_users_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%users}}', [
            'id'             => $this->primaryKey(),
            'name'           => $this->string(100)->notNull(),
            'phone'          => $this->string(20)->notNull()->unique(),
            'email'          => $this->string(150)->null()->unique(),
            'password_hash'  => $this->string(255)->notNull(),
            'auth_key'       => $this->string(32)->notNull(),
            'role'           => $this->string(30)->notNull()->defaultValue('student')
                                     ->comment('super_admin|manager|admin|teacher|student|parent'),
            'avatar'         => $this->string(255)->null(),
            'status'         => $this->smallInteger()->notNull()->defaultValue(10)
                                     ->comment('10=active, 9=inactive, 0=deleted'),
            'center_id'      => $this->integer()->null()->comment('Kelajak uchun multi-tenancy'),
            'created_at'     => $this->integer()->notNull(),
            'updated_at'     => $this->integer()->notNull(),
        ]);

        $this->createIndex('idx_users_role', '{{%users}}', 'role');
        $this->createIndex('idx_users_center', '{{%users}}', 'center_id');
        $this->createIndex('idx_users_status', '{{%users}}', 'status');

        // Refresh token storage
        $this->createTable('{{%user_tokens}}', [
            'id'         => $this->primaryKey(),
            'user_id'    => $this->integer()->notNull(),
            'token'      => $this->string(512)->notNull()->unique(),
            'type'       => $this->string(20)->notNull()->defaultValue('refresh'),
            'expired_at' => $this->integer()->notNull(),
            'created_at' => $this->integer()->notNull(),
        ]);

        $this->addForeignKey(
            'fk_user_tokens_user',
            '{{%user_tokens}}', 'user_id',
            '{{%users}}', 'id',
            'CASCADE', 'CASCADE'
        );

        // Super admin seedi
        $time = time();
        $this->insert('{{%users}}', [
            'name'          => 'Super Admin',
            'phone'         => '+998900000000',
            'email'         => 'admin@oquvmarkaz.uz',
            'password_hash' => Yii::$app->security->generatePasswordHash('Admin123!'),
            'auth_key'      => Yii::$app->security->generateRandomString(),
            'role'          => 'super_admin',
            'status'        => 10,
            'created_at'    => $time,
            'updated_at'    => $time,
        ]);
    }

    public function safeDown()
    {
        $this->dropForeignKey('fk_user_tokens_user', '{{%user_tokens}}');
        $this->dropTable('{{%user_tokens}}');
        $this->dropTable('{{%users}}');
    }
}
