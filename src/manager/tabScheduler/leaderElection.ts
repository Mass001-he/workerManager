import { Emitter } from '../../event';
import { Logger } from '../../logger';

/**
 * 领导选举类
 */
export class LeaderElection {
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
   * 参选
   * @description 最后参选的候选人会被下一次选举时当选。
   */
  public campaign(candidate: string) {
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
      this.campaigners.push(candidate);
      this.logger.info(`Campaigners:`, this.campaigners);
    } else {
      this.changeLeader(candidate);
    }
  }

  public destroy() {
    this.logger.info('LeaderElection destroyed');
    this._onFirstLeaderElection.dispose();
    this._onLeaderChange.dispose();
    this._onNoCandidate.dispose();
  }
}
