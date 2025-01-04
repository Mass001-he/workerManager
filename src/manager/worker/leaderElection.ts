import { Emitter } from "../../event";
import { Logger } from "../../logger";
import type { TabDescriptor } from "../types";

/**
 * 领导选举类
 */
export class LeaderElection {
  public leader: TabDescriptor | undefined = undefined;
  public campaigners: TabDescriptor[] = [];
  private logger = Logger.scope("LeaderElection");

  protected _onFirstLeaderElection = new Emitter<TabDescriptor>();
  protected _onLeaderChange = new Emitter<{
    leader: TabDescriptor;
    oldLeader?: TabDescriptor;
  }>();
  protected _onNoCandidate = new Emitter<void>();
  public onFirstLeaderElection = this._onFirstLeaderElection.event;
  public onLeaderChange = this._onLeaderChange.event;
  public onNoCandidate = this._onNoCandidate.event;

  constructor() {
    this.logger.info("LeaderElection created");
    this._onFirstLeaderElection.event((e) => {
      this.logger.info(`First leader election: ${e.id}`);
    });
    this._onLeaderChange.event((e) => {
      this.logger.info(`Leader change: ${e.leader.id} -> ${e.oldLeader?.id}`);
    });
    this._onNoCandidate.event(() => {
      this.logger.info("No candidate");
    });
  }

  private changeLeader() {
    const oldLeader = this.leader;
    this.leader = this.campaigners.pop()!;
    if (oldLeader === undefined) {
      this._onFirstLeaderElection.fire(this.leader);
    }
    this._onLeaderChange.fire({ leader: this.leader, oldLeader });
  }

  /**
   * 选举领导人
   */
  public electLeader() {
    this.logger.info("Elect leader");
    if (this.campaigners.length === 0) {
      this._onNoCandidate.fire();
      if (this.campaigners.length === 0 && !this.leader) {
        throw new Error("Fatal mistake. No leader and no candidate");
      }
    }
    this.changeLeader();
  }

  /**
   * 参选
   * @description 最后参选的候选人会被下一次选举时当选。如果已经参选,则调整排位到最前。
   */
  public campaign(tab: TabDescriptor) {
    if (tab === undefined) {
      this.logger.error(`Campaign:`, tab);
      return;
    }
    this.logger.info(`Campaign:`, tab.id);
    const idx = this.campaigners.findIndex((t) => t.id === tab.id);
    if (idx !== -1) {
      this.campaigners.splice(idx, 1);
    }
    this.campaigners.unshift(tab);
    this.logger.info(`Campaigners:`, this.campaigners);
  }

  public destroy() {
    this.logger.info("LeaderElection destroyed");
    this._onFirstLeaderElection.dispose();
    this._onLeaderChange.dispose();
    this._onNoCandidate.dispose();
  }
}
