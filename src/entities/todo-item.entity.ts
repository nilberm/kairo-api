import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('todo_items')
export class TodoItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 500 })
  title: string;

  /** Dia ao qual o item pertence (YYYY-MM-DD) */
  @Column('varchar', { length: 10 })
  date: string;

  @Column('timestamptz', { nullable: true })
  completedAt: Date | null;

  /** Se true, não aparece nas sugestões (itens não concluídos de dias anteriores). */
  @Column('boolean', { default: false })
  hiddenFromSuggestions: boolean;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
