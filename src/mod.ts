import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { VFS } from "@spt/utils/VFS";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import path from "path";
import { JsonUtil } from "@spt/utils/JsonUtil";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";

class BiggerBackpacks implements IPostDBLoadMod {
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

        const allitems = this.db.templates.items;
        let backpacksChanged = 0;

        for (const [, item] of Object.entries(allitems)) {

            // We only want items that originate from "backpack" and we filter out backpacks that have a "special" layout. Otherwise it would cause with grids overlapping
            if (item._parent === "5448e53e4bdc2d60728b4567" && item._props.Grids) {

                // We don't want to change backpacks with a predetermined layout, otherwise it would cause overlapping
                if (item._props.GridLayoutName !== "") {
                    // Remove grid layout and then apply size multiplier. Now no backpacks have a layout
                    if (this.config.removeGridLayouts) {
                        item._props.GridLayoutName = "";
                        item._props.Grids = [item._props.Grids[0]];
                        this.debugLog(`Removed grid layout from ${item._id}`);
                    } else {
                        this.debugLog(`Skipped ${item._id} because it has multiple grids`);
                        continue;
                    }
                }

                // Applies the multiplier but clamps the max size of the backpack to specified values. This ensures that no backpacks are too large.
                const oldWidth = item._props.Grids[0]._props.cellsH;
                const oldHeight = item._props.Grids[0]._props.cellsV;

                item._props.Grids[0]._props.cellsH = Math.min(Math.floor(oldWidth * this.config.multiplier), this.config.clampWidth);
                item._props.Grids[0]._props.cellsV = Math.min(Math.floor(oldHeight * this.config.multiplier), this.config.clampHeight);
                backpacksChanged++;

                this.debugLog(`Resized ${item._id} from ${oldWidth}x${oldHeight} to ${item._props.Grids[0]._props.cellsH}x${item._props.Grids[0]._props.cellsV}`);
            }
        }

        this.logger.info(`[BiggerBackpacks] Changed ${backpacksChanged} backpacks`);
    }

    private debugLog(message: string) {
        if (this.config.debug) {
            this.logger.logWithColor(`[BiggerBackpacks] ${message}`, LogTextColor.CYAN);
        }
    }
}


module.exports = { mod: new BiggerBackpacks() };
