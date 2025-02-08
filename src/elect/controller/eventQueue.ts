import { Emitter, Logger } from '../../utils';
export interface EventQueueOptions<T> {
  filter: (item: T, task: T) => boolean;
}

export class EventQueue<T = any> {
  static MAX_CONCURRENCY = 10;
  /**
   * 修改并发数
   */
  static changeConcurrency(value: number) {
    this.MAX_CONCURRENCY = value;
  }
  private eventQueue: T[] = [];
  private activeTasks: T[] = [];
  /** 任务是否正在分发 */
  private isDispatching = false;
  /** Loop是否正在排程 */
  private isLoopScheduled = false;
  private _onTaskActivation = new Emitter<{
    tasks: T[];
  }>();

  public onTaskActivation = this._onTaskActivation.event;
  private options: EventQueueOptions<T>;
  private logger = Logger.scope('EventQueue');

  constructor(options: EventQueueOptions<T>) {
    this.logger.info('Created').print();
    this.options = options;
  }

  /**
   * @description 添加任务到队列,等待执行
   */
  public enqueue(task: T, dispatch = false) {
    this.logger.info('enqueue', dispatch, task).print();
    this.eventQueue.push(task);
    if (dispatch) {
      this.dispatch();
    }
  }

  public dispatch() {
    if (this.isDispatching === false) {
      this.isDispatching = true;
      setTimeout(() => this.queueLoop(), 10);
    }
  }

  private queueLoop() {
    if (this.eventQueue.length === 0) {
      this.isDispatching = false;
    }
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
  public completeTask(item: T) {
    const idx = this.activeTasks.findIndex((t) => this.options.filter(item, t));
    if (idx > -1) {
      this.activeTasks.splice(idx, 1);
      this.logger.info('task completed:', item).print();
    } else {
      this.logger.error('queueItem not found:', item).print();
    }
    if (this.activeTasks.length === 0) {
      this.isDispatching = false;
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.queueLoop());
      }
    }
  }

  /**
   * @description 激活任务
   */
  private fireActiveTask = () => {
    if (this._onTaskActivation.hasListeners() === false) {
      this.logger.error(
        'Severity error !!!!!! No listener for active task, task will be completed',
        this.activeTasks,
      );
      throw new Error('No listener for active task');
    }
    if (this.activeTasks.length === 0) {
      this.logger.info('fireActiveTask, activeTasks is empty').print();
      return;
    }
    this._onTaskActivation.fire({
      tasks: this.activeTasks,
    });
  };

  public destroy() {
    this.logger.info('destroy').print();
    this.eventQueue = [];
    this.activeTasks = [];
    this._onTaskActivation.dispose();
  }
}
