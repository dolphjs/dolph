import { MVCEngine } from '../../common';
    
class MVCAdapterClass {
  private static instance: MVCAdapterClass;
  private engine: MVCEngine;
  private pathToAssets: string;
  private pathToViews: string;

  private constructor() {}

  public static getInstance(): MVCAdapterClass {
    if (!MVCAdapterClass.instance) {
      MVCAdapterClass.instance = new MVCAdapterClass();
    }

    return MVCAdapterClass.instance;
  }

  public setStaticAssets(path: string) {
    this.pathToAssets = path;
  }

  public setViewsDir(path: string) {
    this.pathToViews = path;
  }

  public setViewEngine(engine: MVCEngine) {
    this.engine = engine;
  }

  public getViewsDir() {
    return this.pathToViews;
  }

  public getViewEngine() {
    return this.engine;
  }

  public getAssetsPath() {
    return this.pathToAssets;
  }
}

export const MVCAdapter = MVCAdapterClass.getInstance();
