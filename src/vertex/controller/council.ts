import { Emitter, Logger } from '../utils';
/**
 * 理事会(领导选举类)
 */
export class Council {
  /** 任期时间
   * @default 5 * 60 * 1000 (5分钟)
   */
  static TermOfOffice = 5 * 60 * 1000;
  static setTermOfOffice(time: number) {
    Logger.scope('Council').info('Set term of office:', time);
    Council.TermOfOffice = time;
  }

  public leader: string | undefined = undefined;
  public campaigners: string[] = [];
  private logger = Logger.scope('Council');

  private _onLeaderChange = new Emitter<{
    leader: string;
    oldLeader?: string;
  }>();
  private _onNoCandidate = new Emitter<void>();
  public onLeaderChange = this._onLeaderChange.event;
  public onNoCandidate = this._onNoCandidate.event;
  private _timer: any | undefined;

  constructor() {
    this.logger.info('Created').print();
    this.onLeaderChange((e) => {
      this.logger.info(`Leader change:`, e).print();
    });
    this.onNoCandidate(() => {
      this.logger.info('No candidate').print();
    });
  }

  private changeLeader(leader: string) {
    this.logger.info(`Change leader: ${leader}`).print();

    this.leader = leader;
    //选举成功后,候选人清空，如果leader被消除，则会触发onNoCandidate事件，由上层指派新的leader
    this.campaigners = [];

    this._onLeaderChange.fire({ leader: this.leader });
  }

  /**
   * 选举领导人
   */
  public electLeader() {
    this.logger.info('Elect leader', this.campaigners).print();
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
    this.logger.info('Abdicate', this.leader).print();
    if (this.leader === undefined) {
      this.logger.error('Abdicate: No leader').print();
      return;
    }
    this.leader = undefined;
    this.electLeader();
  }

  /**
   * 淘汰机制之一：任期倒计时
   */
  public tenureCountdown() {
    if (this._timer) {
      this.logger.info('tenureCountdown: timer exists', this._timer).print();
      return;
    }
    this.logger
      .info('Resign of selection：tenure countdown', this.leader)
      .print();
    this._timer = setTimeout(() => {
      this.abdicate();
    }, Council.TermOfOffice);
  }

  /**
   * 连任leader
   */
  public reElected() {
    this.logger.info('Re-elected', this.leader).print();
    clearTimeout(this._timer);
    this._timer = undefined;
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
      this.logger.error(`Campaign:`, candidate).print();
      return;
    }
    this.logger.info(`Campaign:`, candidate).print();
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
        this.logger
          .info(`tenureCountdown Campaigners:`, this.campaigners)
          .print();
      }
    } else {
      this.changeLeader(candidate);
    }
  };

  public destroy() {
    this.logger.info('Council destroyed').print();
    this._onLeaderChange.dispose();
    this._onNoCandidate.dispose();
    clearTimeout(this._timer);
  }
}
