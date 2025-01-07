import { Emitter } from '../../event';
import { Logger } from '../../logger';
import { type QueueTask, type RequestPayload } from '../types';

export class EventQueue {
  static MAX_CONCURRENCY = 5;
  /**
   * 修改并发数
   */
  static changeConcurrency(value: number) {
    this.MAX_CONCURRENCY = value;
  }
  private eventQueue: QueueTask[] = [];
  private activeTasks: QueueTask[] = [];
  /** 任务是否正在分发 */
  private isDispatching = false;
  /** Loop是否正在排程 */
  private isLoopScheduled = false;
  private _onTaskActivation = new Emitter<{
    tasks: QueueTask[];
  }>();

  public onTaskActivation = this._onTaskActivation.event;

  private logger = Logger.scope('EventQueue');

  constructor() {
    this.logger.info('EventQueue created');
  }

  /**
   * @description 添加任务到队列,等待执行
   */
  public enqueue(id: string, payload: RequestPayload) {
    this.logger.info('enqueue', id, payload);
    this.eventQueue.push({ id, payload });
    if (this.isDispatching === false) {
      this.isDispatching = true;
      setTimeout(() => this.queueLoop());
    }
  }

  private queueLoop() {
    if (this.isLoopScheduled) {
      return;
    }
    this.isLoopScheduled = true;
    while (
      this.activeTasks.length < EventQueue.MAX_CONCURRENCY &&
      this.eventQueue.length > 0
    ) {
      const task = this.eventQueue.shift()!;
      this.activeTasks.push(task);
    }
    this.fireActiveTask();
    this.isLoopScheduled = false;
  }

  /**
   * @description 完成任务
   */
  public complete = () => {
    this.logger.info('complete tasks:', this.activeTasks);
    this.activeTasks = [];
    this.isDispatching = false;
    setTimeout(() => this.queueLoop());
  };

  /**
   * @description 激活任务
   */
  private fireActiveTask = () => {
    if (this._onTaskActivation.hasListeners()) {
      this._onTaskActivation.fire({
        tasks: this.activeTasks,
      });
    } else {
      this.complete();
      //当任务激活时没有监听器时,任务将被完成，为了不阻断任务的执行,这里只是使用error级别的日志记录
      this.logger.error(
        'Severity error !!!!!! No listener for active task, task will be completed',
        this.activeTasks,
      );
    }
  };

  /**
   * @description 重新激活任务
   */
  public reActivation() {
    this.fireActiveTask();
  }

  public destroy() {
    this.logger.info('destroy');
    this.eventQueue = [];
    this.activeTasks = [];
    this._onTaskActivation.dispose();
  }
}
