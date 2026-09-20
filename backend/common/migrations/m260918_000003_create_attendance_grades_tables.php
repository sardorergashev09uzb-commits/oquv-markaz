<?php

use yii\db\Migration;

/**
 * Migration: Davomat, baholar, homework
 */
class m260918_000003_create_attendance_grades_tables extends Migration
{
    public function safeUp()
    {
        // ─── Davomat ────────────────────────────────────────────────
        $this->createTable('{{%attendance}}', [
            'id'         => $this->primaryKey(),
            'lesson_id'  => $this->integer()->notNull(),
            'student_id' => $this->integer()->notNull(),
            'status'     => $this->string(10)->notNull()->defaultValue('present')
                                 ->comment('present|absent|late|excused'),
            'note'       => $this->string(255)->null(),
            'marked_by'  => $this->integer()->null()->comment('teacher user_id'),
            'created_at' => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_att_lesson',  '{{%attendance}}', 'lesson_id',  '{{%lessons}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_att_student', '{{%attendance}}', 'student_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_att_unique', '{{%attendance}}', ['lesson_id', 'student_id'], true);
        $this->createIndex('idx_att_student', '{{%attendance}}', 'student_id');

        // ─── Assessmentlar (test/uy vazifasi/imtihon) ───────────────
        $this->createTable('{{%assessments}}', [
            'id'          => $this->primaryKey(),
            'group_id'    => $this->integer()->notNull(),
            'lesson_id'   => $this->integer()->null(),
            'title'       => $this->string(200)->notNull(),
            'type'        => $this->string(20)->notNull()
                                  ->comment('test|homework|speaking|exam|quiz'),
            'max_score'   => $this->smallInteger()->notNull()->defaultValue(100),
            'date'        => $this->date()->notNull(),
            'deadline'    => $this->date()->null(),
            'description' => $this->text()->null(),
            'created_by'  => $this->integer()->notNull(),
            'created_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_assess_group', '{{%assessments}}', 'group_id', '{{%groups}}', 'id', 'CASCADE', 'CASCADE');

        // ─── Baholar ────────────────────────────────────────────────
        $this->createTable('{{%assessment_scores}}', [
            'id'             => $this->primaryKey(),
            'assessment_id'  => $this->integer()->notNull(),
            'student_id'     => $this->integer()->notNull(),
            'score'          => $this->float()->null(),
            'feedback'       => $this->text()->null(),
            'status'         => $this->string(20)->notNull()->defaultValue('pending')
                                     ->comment('pending|submitted|graded'),
            'graded_by'      => $this->integer()->null(),
            'graded_at'      => $this->integer()->null(),
            'created_at'     => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_scores_assess',  '{{%assessment_scores}}', 'assessment_id', '{{%assessments}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_scores_student', '{{%assessment_scores}}', 'student_id',    '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_scores_unique', '{{%assessment_scores}}', ['assessment_id', 'student_id'], true);

        // ─── Uy vazifalari (batafsil) ───────────────────────────────
        $this->createTable('{{%homework}}', [
            'id'          => $this->primaryKey(),
            'lesson_id'   => $this->integer()->notNull(),
            'title'       => $this->string(200)->notNull(),
            'description' => $this->text()->null(),
            'deadline'    => $this->dateTime()->null(),
            'max_score'   => $this->smallInteger()->notNull()->defaultValue(10),
            'created_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_hw_lesson', '{{%homework}}', 'lesson_id', '{{%lessons}}', 'id', 'CASCADE', 'CASCADE');

        $this->createTable('{{%homework_submissions}}', [
            'id'          => $this->primaryKey(),
            'homework_id' => $this->integer()->notNull(),
            'student_id'  => $this->integer()->notNull(),
            'file_url'    => $this->string(500)->null(),
            'comment'     => $this->text()->null(),
            'score'       => $this->float()->null(),
            'feedback'    => $this->text()->null(),
            'status'      => $this->string(20)->notNull()->defaultValue('not_submitted')
                                  ->comment('not_submitted|submitted|graded'),
            'submitted_at' => $this->integer()->null(),
            'graded_at'   => $this->integer()->null(),
        ]);

        $this->addForeignKey('fk_sub_hw',      '{{%homework_submissions}}', 'homework_id', '{{%homework}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_sub_student', '{{%homework_submissions}}', 'student_id',  '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_sub_unique', '{{%homework_submissions}}', ['homework_id', 'student_id'], true);
    }

    public function safeDown()
    {
        $this->dropTable('{{%homework_submissions}}');
        $this->dropTable('{{%homework}}');
        $this->dropTable('{{%assessment_scores}}');
        $this->dropTable('{{%assessments}}');
        $this->dropTable('{{%attendance}}');
    }
}
