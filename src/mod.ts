import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { VFS } from "@spt/utils/VFS";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import path from "path";
import { JsonUtil } from "@spt/utils/JsonUtil";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";


class TransitTweaker implements IPostDBLoadMod {
    private config: any;
    private logger: ILogger;
    private databaseServer: DatabaseServer;
    private vfs: VFS;
    private jsonUtil: JsonUtil;
    private db: IDatabaseTables;

    public postDBLoad(container: DependencyContainer): void {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.vfs = container.resolve<VFS>("VFS");
        this.jsonUtil = container.resolve<JsonUtil>("JsonUtil");
        this.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        this.db = this.databaseServer.getTables();

        this.config = this.jsonUtil.deserializeJson5(this.vfs.readFile(path.join(__dirname , "../config/config.json5")));

        const transitConfig = this.db.globals.config.TransitSettings;
        const fenceConfig   = this.db.globals.config.FenceSettings;

        // There has to be a better way, no?
        const locations     = [this.db.locations.bigmap, this.db.locations.develop, this.db.locations.factory4_day, this.db.locations.factory4_night, this.db.locations.interchange, this.db.locations.laboratory, this.db.locations.lighthouse, this.db.locations.privatearea, this.db.locations.rezervbase, this.db.locations.shoreline, this.db.locations.suburbs, this.db.locations.tarkovstreets, this.db.locations.terminal, this.db.locations.town, this.db.locations.woods];

        //#region Cost
        transitConfig.BearPriceMod *= this.config.transitCostMultiplier;
        transitConfig.UsecPriceMod *= this.config.transitCostMultiplier;
        //#endregion

        //#region Grid size
        for (const [, fenceLevel] of Object.entries(fenceConfig.Levels)) {
            // Max size is 12x12
            fenceLevel.TransitGridSize.x *= Math.min(Math.round(this.config.transitGridSizeMultiplier), 12);
            fenceLevel.TransitGridSize.y *= Math.min(Math.round(this.config.transitGridSizeMultiplier), 12);
        }
        //#endregion

        //#region Transit time
        for (const location of locations) {
            const transits = location.base.transits;

            // Check if transits are null
            if (!transits) {
                continue;
            }

            for (const transit of transits) {
                transit.time = Math.min(Math.round(transit.time * this.config.transitTimeMultiplier), 1);
            }
        }
        //#endregion
        
        this.logger.info("[TransitTweaker] loaded.");
    }

    private debugLog(message: string) {
        if (this.config.debug) {
            this.logger.logWithColor(`[BiggerBackpacks] ${message}`, LogTextColor.CYAN);
        }
    }
}


module.exports = { mod: new TransitTweaker() };
