module junyou {
    /**
     * 
     * 
     * @export
     * @class UModel
     * @extends {egret.DisplayObjectContainer}
     * @author 3tion
     */
    export class UModel extends egret.DisplayObjectContainer {
        /**
         * 独立使用时，用于排序深度
         * 
         * @type {number}
         */
        public depth?: number;

        /**
         * 检查/重置资源列表
         * 
         * @param {string[]} resOrder 部位的排列顺序
         * @param {{ [index: string]: UnitResource }} resDict 部位和资源的字典
         */
        public checkResList(resOrder: string[], resDict: { [index: string]: UnitResource }) {
            let children = this.$children;
            let i = 0;
            let len = children.length;
            let part: Recyclable<ResourceBitmap>;
            for (let key of resOrder) {
                let res = resDict[key];
                if (res) {
                    if (i < len) {
                        part = <Recyclable<ResourceBitmap>>children[i++];
                    } else {
                        part = recyclable(ResourceBitmap);
                        this.addChild(part);
                    }
                    part.res = res;
                }
            }
            //移除多余子对象
            for (let j = len - 1; j >= i; j--) {
                part = <Recyclable<ResourceBitmap>>this.$doRemoveChild(j);
                part.recycle();
            }
        }

        renderFrame(frame: FrameInfo, now: number, face: number, info: IDrawInfo) {
            let ns = face > 4;
            let d = ns ? 8 - face : face;
            if (frame) {
                let scale = face > 4 ? -1 : 1;
                if (frame.d == -1) {
                    this.scaleX = scale;
                    info.d = d;
                }
                else {
                    info.d = frame.d;
                }
                info.f = frame.f;
                info.a = frame.a;
            } else {
                info.d = d;
            }
            //渲染
            for (let res of <ResourceBitmap[]>this.$children) {
                res.draw(info, now);
            }
        }

        clear() {
            this.scaleX = 1;
            this.scaleY = 1;
            this.rotation = 0;
            this.alpha = 1;
            let list = this.$children as Recyclable<ResourceBitmap>[];
            for (let bmp of list) {
                bmp.recycle();
            }
        }

        onRecycle() {
            removeDisplay(this);
            this.clear();
        }
    }
}