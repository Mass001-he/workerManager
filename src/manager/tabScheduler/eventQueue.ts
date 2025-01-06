import { Emitter } from '../../event';
import { Logger } from '../../logger';
import {
  type QueueElement,
  type RequestPayload,
} from '../types';

export class EventQueue {
  static MAX_CONCURRENCY = 6;
  /**
   * 修改并发数
   */
  static changeConcurrency(value: number) {
    this.MAX_CONCURRENCY = value;
  }
  private eventQueue: QueueElement[] = [];
  private activeTasks: QueueElement[] = [];
  private isDispatching = false;
  private _onTaskActivation = new Emitter<{
    task: QueueElement;
    completeTask: () => void;
  }>();

  public onTaskActivation = this._onTaskActivation.event;

  private logger = Logger.scope('EventQueue');

  constructor() {
    this.logger.info('EventQueue created');
  }

  /**
   * @description 添加任务到队列,等待执行
   */
  public enqueue(tabId: string, payload: RequestPayload) {
    this.logger.info('enqueue', tabId, payload);
    this.eventQueue.push({ tabId, payload });
    this.dispatch();
  }

  /**
   * @description 完成任务
   */
  public completeTask = (task: QueueElement) => {
    const index = this.activeTasks.indexOf(task);
    if (index !== -1) {
      this.activeTasks.splice(index, 1);
    }
    this.dispatch();
  };

  /**
   * @description 激活任务
   */
  private activeTask = (task: QueueElement) => {
    if (this._onTaskActivation.hasListeners()) {
      this._onTaskActivation.fire({
        task,
        completeTask: () => {
          this.completeTask(task);
        },
      });
    } else {
      this.completeTask(task);
      //当任务激活时没有监听器时,任务将被完成，为了不阻断任务的执行,这里只是使用error级别的日志记录
      this.logger.error(
        'Severity error !!!!!! No listener for active task, task will be completed',
      );
    }
  };

  /**
   * @description 重新激活任务
   */
  public reActivation() {
    this.activeTasks.forEach((task) => {
      this.activeTask(task);
    });
  }

  /**
   * @description 处理队列
   */
  private dispatch() {
    if (this.isDispatching === true) {
      return;
    }
    this.isDispatching = true;
    while (
      this.activeTasks.length < EventQueue.MAX_CONCURRENCY &&
      this.eventQueue.length > 0
    ) {
      const task = this.eventQueue.shift()!;
      this.activeTasks.push(task);
      this.activeTask(task);
    }
    this.isDispatching = false;
  }

  public destroy() {
    this.logger.info('destroy');
    this.eventQueue = [];
    this.activeTasks = [];
    this._onTaskActivation.dispose();
  }
}
