<?php

use yii\db\Migration;

/**
 * Migration: O'quv markaz yadro jadvallari
 * courses, rooms, groups, group_students, lessons
 */
class m260918_000002_create_core_academic_tables extends Migration
{
    public function safeUp()
    {
        // ─── Kurslar ───────────────────────────────────────────────
        $this->createTable('{{%courses}}', [
            'id'               => $this->primaryKey(),
            'name'             => $this->string(100)->notNull(),
            'level'            => $this->string(50)->null()->comment('A1,A2,B1,B2,C1,C2'),
            'description'      => $this->text()->null(),
            'duration_months'  => $this->smallInteger()->notNull()->defaultValue(3),
            'price'            => $this->integer()->notNull()->defaultValue(0)->comment('UZS'),
            'center_id'        => $this->integer()->null(),
            'status'           => $this->smallInteger()->notNull()->defaultValue(1),
            'created_at'       => $this->integer()->notNull(),
            'updated_at'       => $this->integer()->notNull(),
        ]);

        // ─── Xonalar ───────────────────────────────────────────────
        $this->createTable('{{%rooms}}', [
            'id'         => $this->primaryKey(),
            'name'       => $this->string(50)->notNull(),
            'capacity'   => $this->smallInteger()->notNull()->defaultValue(20),
            'center_id'  => $this->integer()->null(),
            'status'     => $this->smallInteger()->notNull()->defaultValue(1),
        ]);

        // ─── Guruhlar ───────────────────────────────────────────────
        $this->createTable('{{%groups}}', [
            'id'            => $this->primaryKey(),
            'name'          => $this->string(100)->notNull(),
            'course_id'     => $this->integer()->notNull(),
            'teacher_id'    => $this->integer()->notNull(),
            'room_id'       => $this->integer()->null(),
            'schedule_json' => $this->text()->null()
                                    ->comment('JSON: [{day:"mon",time:"17:00"}]'),
            'start_date'    => $this->date()->null(),
            'end_date'      => $this->date()->null(),
            'max_students'  => $this->smallInteger()->notNull()->defaultValue(15),
            'center_id'     => $this->integer()->null(),
            'status'        => $this->string(20)->notNull()->defaultValue('active')
                                    ->comment('active|completed|paused'),
            'created_at'    => $this->integer()->notNull(),
            'updated_at'    => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_groups_course',  '{{%groups}}', 'course_id',  '{{%courses}}', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_groups_teacher', '{{%groups}}', 'teacher_id', '{{%users}}', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_groups_room',    '{{%groups}}', 'room_id',    '{{%rooms}}', 'id', 'SET NULL', 'CASCADE');

        // ─── Guruh-o'quvchi bog'lanishi ─────────────────────────────
        $this->createTable('{{%group_students}}', [
            'id'          => $this->primaryKey(),
            'group_id'    => $this->integer()->notNull(),
            'student_id'  => $this->integer()->notNull(),
            'enrolled_at' => $this->date()->notNull(),
            'left_at'     => $this->date()->null(),
            'status'      => $this->string(20)->notNull()->defaultValue('active')
                                  ->comment('active|frozen|completed|left'),
        ]);

        $this->addForeignKey('fk_gs_group',   '{{%group_students}}', 'group_id',   '{{%groups}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_gs_student', '{{%group_students}}', 'student_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_gs_unique', '{{%group_students}}', ['group_id', 'student_id'], true);

        // ─── Darslar ────────────────────────────────────────────────
        $this->createTable('{{%lessons}}', [
            'id'          => $this->primaryKey(),
            'group_id'    => $this->integer()->notNull(),
            'topic'       => $this->string(255)->null(),
            'started_at'  => $this->dateTime()->notNull(),
            'ended_at'    => $this->dateTime()->null(),
            'status'      => $this->string(20)->notNull()->defaultValue('scheduled')
                                  ->comment('scheduled|active|completed|cancelled'),
            'note'        => $this->text()->null(),
            'created_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_lessons_group', '{{%lessons}}', 'group_id', '{{%groups}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_lessons_started', '{{%lessons}}', 'started_at');
    }

    public function safeDown()
    {
        $this->dropTable('{{%lessons}}');
        $this->dropTable('{{%group_students}}');
        $this->dropTable('{{%groups}}');
        $this->dropTable('{{%rooms}}');
        $this->dropTable('{{%courses}}');
    }
}
