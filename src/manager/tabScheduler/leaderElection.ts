import { Emitter } from '../../event';
import { Logger } from '../../logger';

/**
 * 领导选举类
 */
export class LeaderElection {
  /** 任期时间
   * @default 5 * 60 * 1000 (5分钟)
   */
  static termOfOffice = 10000; //5 * 60 * 1000;
  static setTermOfOffice(time: number) {
    Logger.scope('LeaderElection').info('Set term of office:', time);
    LeaderElection.termOfOffice = time;
  }

  public leader: string | undefined = undefined;
  public campaigners: string[] = [];
  private logger = Logger.scope('LeaderElection');

  private _onFirstLeaderElection = new Emitter<string>();
  private _onLeaderChange = new Emitter<{
    leader: string;
    oldLeader?: string;
  }>();
  private _onNoCandidate = new Emitter<void>();
  public onFirstLeaderElection = this._onFirstLeaderElection.event;
  public onLeaderChange = this._onLeaderChange.event;
  public onNoCandidate = this._onNoCandidate.event;
  private _timer: any | undefined;

  constructor() {
    this.logger.info('LeaderElection created');
    this._onFirstLeaderElection.event((id) => {
      this.logger.info(`First leader election: ${id}`);
    });
    this._onLeaderChange.event((e) => {
      this.logger.info(`Leader change:`, e);
    });
    this._onNoCandidate.event(() => {
      this.logger.info('No candidate');
    });
  }

  private changeLeader(leader: string) {
    this.logger.info(`Change leader: ${leader}`);
    const oldLeader = this.leader;
    this.leader = leader;
    //选举成功后,候选人清空，如果leader被消除，则会触发onNoCandidate事件，由上层指派新的leader
    this.campaigners = [];
    if (oldLeader === undefined) {
      this._onFirstLeaderElection.fire(this.leader);
    } else {
      this._onLeaderChange.fire({ leader: this.leader, oldLeader });
    }
  }

  /**
   * 选举领导人
   */
  public electLeader() {
    this.logger.info('Elect leader');
    if (this.campaigners.length === 0) {
      this._onNoCandidate.fire();
      if (this.campaigners.length === 0 && !this.leader) {
        throw new Error('Fatal mistake. No leader and no candidate');
      }
    }
    const leader = this.campaigners.pop()!;
    this.changeLeader(leader);
  }

  /**
   * 退位
   */
  public abdicate() {
    this.logger.info('Abdicate');
    if (this.leader === undefined) {
      this.logger.error('Abdicate: No leader');
      return;
    }
    this.leader = undefined;
    this.electLeader();
  }

  /**
   * 淘汰机制之一：任期倒计时
   */
  public tenureCountdown() {
    this.logger.info('Start timer');
    if (this._timer) {
      return;
    }
    this._timer = setTimeout(() => {
      this.abdicate();
    }, LeaderElection.termOfOffice);
  }

  /**
   * 连任leader
   */
  public reElected() {
    this.logger.info('Re-elected');
    clearTimeout(this._timer);
  }

  /**
   * 参选
   * @description 最后参选的候选人会被下一次选举时当选。
   */
  public campaign = (candidate: string) => {
    //如果当前leader是候选人，且没有其他候选人，不进行选举
    if (this.leader === candidate && this.campaigners.length === 0) {
      return;
    }
    if (candidate === undefined) {
      this.logger.error(`Campaign:`, candidate);
      return;
    }
    this.logger.info(`Campaign:`, candidate);
    const idx = this.campaigners.findIndex((id) => id === candidate);
    if (idx !== -1) {
      this.campaigners.splice(idx, 1);
    }
    if (this.leader) {
      if (this.leader === candidate) {
        this.reElected();
      } else {
        this.campaigners.push(candidate);
        this.tenureCountdown();
        this.logger.info(`Campaigners:`, this.campaigners);
      }
    } else {
      this.changeLeader(candidate);
    }
  };

  public destroy() {
    this.logger.info('LeaderElection destroyed');
    this._onFirstLeaderElection.dispose();
    this._onLeaderChange.dispose();
    this._onNoCandidate.dispose();
    clearTimeout(this._timer);
  }
}
