module junyou {
	/**
	 * 模块管理器
	 * 用于管理模块的开启/关闭
	 * @author 3tion
	 *
	 */
    export class ModuleManager {

        /**
         * 显示tip的函数
         */
        showTip: { (msg: ModuleTipState): void };

    	/**
    	 * 字典<br/>
    	 * Key      {string}        模块ID<br/>
    	 * Value    {ModuleCfg}     模块配置
    	 */
        _allById: { [index: string]: IModuleCfg };

        /**
         * 功能使用/显示限制的检查器<br/>
         * Key      {number}                检查器的类型对应limittype/showtype字段<br/>
         * Value    {IModuleChecker}		  模块限制检查器
         */
        _checkers: { [index: number]: IModuleChecker };


        /**
         * 需要检查
         */
        _needCheck = false;


        /**
         * 需要检查显示
         */
        _needCheckShow = false;

        /**
		 * 未显示的按钮的模块
		 */
        _unshowns: (string | number)[];


        /**
         * Key      {number} 模块id<br/>
		 * Value    {egret.DisplayObject[]} 绑定在同一个模块上的按钮的数组
         */
        _bindedIOById: { [index: number]: egret.DisplayObject[] };


        /**
         * Key      {number}            模块类型<br/>
         * Value    {IModuleHandler}    模块处理器
         */
        _handlersByType: { [index: number]: ModuleHandler };


        /**
         * Key      {string}            模块id<br/>
         * Value    {IModuleHandler}    模块处理器
         */
        _handlersById: { [index: string]: ModuleHandler };

        /**
         * Key      {egret.DisplayObject}   绑定的交互对象<br/>
         * Value    {number}                模块id
         */
        _ioBind: Map<egret.DisplayObject, string | number>;


        constructor() {
        }

        init() {
            this._bindedIOById = [];
            this._handlersByType = [];
            this._checkers = [];
            this._allById = {};
            this._unshowns = [];
            this._handlersById = {};
            this._ioBind = new Map<egret.DisplayObject, string | number>();
            on(EventConst.MODULE_NEED_CHECK_SHOW, this.checkShowHandler, this);
        }

        /**
         *  创建控件ToolTip的方法
         */
        createToolTip: (cfg: IModuleCfg) => string;

    	/**
    	 * 设置模块配置数据
    	 * @param { [index: string]: ModuleCfg }    cfgs
    	 */
        setCfgs(cfgs: { [index: string]: IModuleCfg }) {
            this._allById = cfgs;
            this.doCheckLimits();
        }

        /**
         * 根据配置类型，注册模块处理器
         * @param type
         * @param handler
         *
         */
        registerHandler(type: number, handler: ModuleHandler): void {
            this._handlersByType[type] = handler;
        }
        /**
         * 根据模块ID注册处理函数
         * @param id
         * @param handler
         *
         */
        registerHandlerById(id: string | number, handler: ModuleHandler): void {
            let cfg: IModuleCfg = this._allById[id];
            if (cfg) {
                this._handlersById[id] = handler;
            } else {
                ThrowError("ModuleManager 注册模块处理函数时，没有找到对应的模块配置，模块id:" + id);
            }
        }
    	/**
		 * 设置限制检查器
		 * @param value	一个字典<br/>
		 * Key  	{number}            限制器(showtype,limittype)类型<br/>
		 * Value	{IModuleChecker}	    模块限制检查器
		 *
		 */
        set checkers(value: { [index: number]: IModuleChecker }) {
            this._checkers = value;
            this.doCheckLimits();
        }

        doCheckLimits() {
            this._needCheck = true;
            egret.callLater(this.checkLimits, this);
        }


        /**
         * 检查限制
         */
        checkLimits(): void {
            if (this._needCheck) {
                this._needCheck = false;
                let _checks = this._checkers;
                let _allById = this._allById;
                if (_checks) {
                    if (DEBUG) {
                        var errString = "";
                        var limitWarn = "";
                        var unsolve = "";
                    }
                    var checker: IModuleChecker;
                    for (let id in _allById) {
                        let cfg: IModuleCfg = _allById[id];
                        var showtype = cfg.showtype;
                        if (showtype) {
                            checker = _checks[showtype] as IModuleChecker;
                            if (DEBUG) {
                                if (!checker) {
                                    unsolve += cfg.id + "的显示限制 ";
                                }
                            }
                        }
                        var limittype = cfg.limittype;
                        if (limittype) {
                            checker = _checks[limittype] as IModuleChecker;
                            if (DEBUG) {
                                if (!checker) {
                                    unsolve += cfg.id + "的使用限制 ";
                                }
                            }
                        }
                        if (showtype == limittype) {
                            if (showtype) {
                                if (checker) {
                                    if (RELEASE) {
                                        checker.adjustLimitDatas(cfg.showlimits, cfg.limits);
                                    }
                                    if (DEBUG) {
                                        if (checker.adjustLimitDatas(cfg.showlimits, cfg.limits)) {
                                            errString += cfg.id + " ";
                                        }
                                    }
                                }
                            }
                        } else {
                            if (DEBUG) {
                                limitWarn += cfg.id + " ";
                            }
                        }
                        if (!this.isModuleShow(cfg)) //
                        {
                            let id = cfg.id;
                            this._unshowns.push(id);
                            let displays = this._bindedIOById[id];
                            if (displays) {
                                for (var io of displays) {
                                    io.visible = false;
                                }
                            }
                        }
                    }

                    if (DEBUG) {
                        if (limitWarn) {
                            ThrowError("id为：" + limitWarn + "的功能配置，showtype和limittype不一致，请确认是否要这样，这种配置将无法通过程序的方式确认当可以使用功能的时候，是否一定看得见功能入口");
                        }
                        if (errString) {
                            ThrowError("id为:" + errString + "的功能配置使用限制和显示限制配置有误，自动进行修正");
                        }
                        if (unsolve) {
                            ThrowError("有功能配置的限制类型并未实现：");
                        }
                    }
                    dispatch(EventConst.MODULE_CHECKER_INITED);
                }
            }
        }


        /**
         * 模块是否已经显示
         * @param module    {string | number | IModuleCfg}    模块或者模块配置
         */
        isModuleShow(module: string | number | IModuleCfg): boolean {
            let cfg: IModuleCfg = this.getCfg(module);
            if (DEBUG) {
                if (!cfg) {
                    ThrowError(`没有找到对应的功能配置[${module}]`);
                }
            }
            let flag = cfg && cfg.close != ModuleCloseState.Closed;
            if (flag && this._checkers) {
                var checker: IModuleChecker = this._checkers[cfg.showtype] as IModuleChecker;
                if (checker) {
                    flag = checker.check(cfg.showlimits, false);
                }
            }
            return flag;
        }

        /**
         * 模块是否已经开启
         * @param module    {string | number | IModuleCfg}    模块或者模块配置
         * @param showtip   是否显示Tip
         */
        isModuleOpened(module: string | number | IModuleCfg, showtip: boolean): boolean {
            let cfg: IModuleCfg = this.getCfg(module);
            if (DEBUG) {
                if (!cfg) {
                    ThrowError(`没有找到对应的功能配置[${module}]`);
                }
            }
            if (RELEASE || ClientCheck.isClientCheck) { //屏蔽客户端检测只针对open，不针对show
                var flag = cfg && !cfg.close && cfg.serverOpen;
                if (flag) {
                    if (this._checkers) {
                        var checker: IModuleChecker = this._checkers[cfg.limittype] as IModuleChecker;
                        if (checker) {
                            flag = checker.check(cfg.limits, showtip);
                        }
                    }
                }
                else {
                    if (showtip && this.showTip) {
                        this.showTip(ModuleTipState.ComingSoon);
                    }
                }
                return flag;
            } else {
                return true;
            }
        }

        /**
         * 将交互对象和功能id进行绑定，当交互对象抛出事件后，会执行功能对应的处理器
         * @param id					功能id
         * @param io					交互对象
         * @param eventType		事件
         *
         */
        bindButton(id: string | number, io: egret.DisplayObject, eventType: string = EgretEvent.TOUCH_TAP): void {
            if (this._ioBind.has(io)) {
                ThrowError("ModuleManager 注册按钮时候，重复注册了按钮");
                return;
            }
            var cfg: IModuleCfg = this._allById[id] as IModuleCfg;
            if (!cfg) {
                ThrowError("ModuleManager 注册按钮时候，没有找到对应的模块配置，模块id:" + id);
                return;
            }
            var arr = this._bindedIOById[id];
            if (!arr) {
                this._bindedIOById[id] = arr = [];
            }
            arr.push(io);
            this._ioBind.set(io, id);
            io.on(eventType, this.ioHandler, this);
            if (this.createToolTip) {
                var toolTips = this.createToolTip(cfg);
                if (toolTips) {
                    ToolTipManager.register(io, toolTips);
                }
            }
            var moduleHandler = this._handlersByType[cfg.type];
            if (moduleHandler) {
                this.registerHandlerById(id, moduleHandler);
            }
            let _unshowns = this._unshowns;
            if (!this.isModuleShow(id)) {
                io.visible = false;
                _unshowns.pushOnce(id);
            }
            else {
                _unshowns.remove(id);
            }
        }

        /**
         * 交互事件的处理
         * @param event
         *
         */
        ioHandler(event: egret.Event): void {
            this.toggle(this._ioBind.get(event.currentTarget));
        }

        /**
		 * 检查显示
		 * @param event
		 *
		 */
        checkShowHandler(): void {
            this._needCheckShow = true;
            egret.callLater(this._checkShowHandler, this);
        }

        _checkShowHandler() {
            if (!this._needCheckShow) {
                return;
            }
            this._needCheckShow = false;
            let changed = false;
            let { _allById, _unshowns } = this;
            for (let i = _unshowns.length - 1; i >= 0; i--) {
                let id = _unshowns[i];
                let cfg = _allById[id];
                if (this.isModuleShow(cfg)) {
                    let displays = this._bindedIOById[id];
                    if (displays) {
                        for (let dis of displays) {
                            dis.visible = true;
                        }
                    }
                    changed = true;
                    _unshowns.splice(i, 1);
                    dispatch(EventConst.MODULE_SHOW, id);
                    let onOpen = cfg.onOpen;
                    if (onOpen) {
                        for (let j = 0; j < onOpen.length; j++) {
                            const callback = onOpen[j];
                            callback.execute();
                        }
                        cfg.onOpen = undefined;
                    }
                }
            }
            if (changed) {
                dispatch(EventConst.MODULE_SHOW_CHANGED, _unshowns.length);
            }
        }


        /**
         * 
         * 打开/关闭指定模块
         * @param {(string | number)} moduleID      模块id
         * @param {ToggleState} [toggleState]      0 自动切换(默认)<br/>  1 打开模块<br/> -1 关闭模块<br/>  
         * @param {boolean} [showTip=true]          是否显示Tip
         * @return true   可以正常打开
         *         false  被模块配置拦截，无法打开
         */
        toggle(moduleID: string | number, show?: ToggleState, showtip = true, param?: ModuleParam) {
            var cfg: IModuleCfg = this._allById[moduleID] as IModuleCfg;
            if (!cfg) {
                ThrowError("ModuleManager execute时，无法找到对应模块配置,ModuleID为:" + moduleID);
                return false;
            }
            dispatch(EventConst.MODULE_TRY_TOGGLE, moduleID);
            if (!this.isModuleOpened(cfg, showtip)) {
                return false;
            }
            let moduleHandler = this._handlersById[moduleID];
            if (!moduleHandler) {
                moduleHandler = this._handlersByType[cfg.type];
            }
            if (moduleHandler) {
                show = ~~show;
                switch (show) {
                    case ToggleState.AUTO:
                        switch (cfg.showState) {
                            case ModuleShowState.HIDE:
                            case ModuleShowState.HIDING:
                                moduleHandler.show(cfg, param);
                                break;
                            case ModuleShowState.SHOW:
                            case ModuleShowState.SHOWING:
                                moduleHandler.hide(cfg, param);
                                break;
                        }
                        break;
                    case ToggleState.HIDE:
                        moduleHandler.hide(cfg, param);
                        break;
                    case ToggleState.SHOW:
                        moduleHandler.show(cfg, param);
                        break;
                }
                return true;
            }
            return false;
        }

        /**
         * 获取模块
         * @param module
         */
        getCfg(module: string | number | IModuleCfg) {
            return typeof module === "object" ? module : this._allById[module];
        }

        /**
         * 改变服务器模块状态
         * 
         * @param {string | number}  mid    服务器模块id
         * @param {boolean} state       模块状态
         */
        serverChangeModuleState(mid: string | number, state: boolean) {
            let mcfg = this._allById[mid];
            if (mcfg) {
                if (state != mcfg.serverOpen) {
                    mcfg.serverOpen = state;
                    dispatch(state ? EventConst.MODULE_SERVER_OPEN : EventConst.MODULE_SERVER_CLOSE, mid);
                }
            }
        }

        regModuleOpen(mid: Key, callback: $CallbackInfo) {
            let cfg = this._allById[mid];
            if (cfg) {
                if (this.isModuleOpened(cfg, false)) {
                    callback.execute();
                } else {
                    let onOpen = cfg.onOpen;
                    if (!onOpen) {
                        cfg.onOpen = onOpen = [];
                    }
                    onOpen.pushOnce(callback);
                }
            }
        }
    }
}
