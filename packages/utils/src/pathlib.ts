import fs from 'fs/promises';
import fs_sync from 'fs';

export class PathError extends Error {
  constructor(
    message: string,
    public path?: string | Path,
    public cause?: Error,
  ) {
    super(message);
  }

  toString(): string {
    if (this.path) {
      return `${this.path.toString()}: ${
        this.message
      } \n due to: ${this.cause?.toString()}`;
    } else {
      return this.message;
    }
  }
}

/**
 * Convenient abstraction of paths.
 * A Path object is immutable.
 * Twin to python's Pathlib.
 */
export class Path {
  static cwd(): Path {
    return new Path(process.cwd());
  }

  protected readonly _absolute: boolean = false;
  protected readonly _path_segs: string[];
  protected readonly _path: string; // cache of toString

  /**
   * Create a Path object from a string path.
   * @param path
   */
  constructor(path: string);

  /**
   * Create a Path object from path segments and whether it is absolute.
   * @param path_segs
   * @param is_absolute
   */
  constructor(path_segs: string[], is_absolute: boolean);

  /**
   * Create a Path object.
   * @param path
   * @param is_absolute
   */
  constructor(path: string | string[], is_absolute: boolean = false) {
    if (typeof path === 'string') {
      is_absolute = path.startsWith('/');
      this._path = path;
      this._path_segs = path.split('/').filter((seg) => seg.length > 0);
    } else {
      this._path = (is_absolute ? '/' : '') + path.join('/');
      this._path_segs = path
        .map((seg) => seg.split('/').filter((s) => s.length > 0))
        .flat();
    }
    this._absolute = is_absolute;
  }

  toString(): string {
    return this._path;
  }

  /**
   * Convert to absolute path, relative to the current working directory.
   */
  get absolute(): Path {
    if (this._absolute) {
      return this;
    } else {
      return Path.cwd().child(this);
    }
  }

  get is_absolute(): boolean {
    return this._absolute;
  }

  get is_relative(): boolean {
    return !this._absolute;
  }

  /**
   * Whether the path exists on the file system.
   */
  exists(): Promise<boolean> {
    return fs
      .access(this._path)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Whether the path exists on the file system.
   * Sync API.
   */
  existsSync(): boolean {
    return fs_sync.existsSync(this._path);
  }

  /**
   * Get child path.
   * @param relative_path
   * @returns A new Path object representing the child path.
   */
  child(relative_path: string): Path;
  child(relative_path: string[]): Path;
  child(...relative_paths: string[]): Path;
  child(relative_path: Path): Path;
  child(relative_path: string | string[] | Path): Path {
    if (typeof relative_path === 'string') {
      const rPath = new Path(relative_path);
      return this.child(rPath);
    } else if (relative_path instanceof Array) {
      const rPath = new Path(relative_path, false);
      return this.child(rPath);
    } else {
      if (relative_path._absolute) {
        throw new PathError('Cannot child with absolute path', relative_path);
      }
      return new Path(
        [...this._path_segs, ...relative_path._path_segs],
        this._absolute,
      );
    }
  }

  /**
   * Get the relative path from the given path to this path.
   * @param src
   */
  relativeFrom(src: string): Path;
  relativeFrom(src: Path): Path;
  relativeFrom(src: string | Path): Path {
    if (typeof src === 'string') {
      const srcPath = new Path(src);
      return this.relativeFrom(srcPath);
    } else {
      src = src.absolute;
      const dest = this.absolute;
      const srcPathSegs = src._path_segs;
      const thisPathSegs = dest._path_segs;
      const commonPrefix = thisPathSegs.filter(
        (seg, i) => srcPathSegs[i] === seg,
      ).length;
      const segs = [];
      for (let i = 0; i < srcPathSegs.length - commonPrefix; i++) {
        segs.push('..');
      }
      segs.push(...thisPathSegs.slice(commonPrefix));
      return new Path(segs, false);
    }
  }

  /**
   * Get the relative path from this path to the given path.
   * @param dest
   */
  relativeTo(dest: string): Path;
  relativeTo(dest: Path): Path;
  relativeTo(dest: string | Path): Path {
    if (typeof dest === 'string') {
      const destPath = new Path(dest);
      return this.relativeTo(destPath);
    } else {
      return dest.relativeFrom(this);
    }
  }

  /**
   * Read the file at this path.
   */
  async read(): Promise<string> {
    try {
      return await fs.readFile(this.toString(), { encoding: 'utf-8' });
    } catch (e) {
      throw new PathError('Failed to read file', this, e as Error);
    }
  }

  /**
   * Read the file at this path.
   * Sync API.
   */
  readSync(): string {
    try {
      return fs_sync.readFileSync(this.toString(), { encoding: 'utf-8' });
    } catch (e) {
      throw new PathError('Failed to read file', this, e as Error);
    }
  }

  /**
   * Write the file at this path.
   * @param data
   */
  async write(data: string): Promise<void> {
    try {
      return await fs.writeFile(this.toString(), data, { encoding: 'utf-8' });
    } catch (e) {
      throw new PathError('Failed to write file', this, e as Error);
    }
  }

  /**
   * Write the file at this path.
   * Sync API.
   * @param data
   */
  writeSync(data: string): void {
    try {
      return fs_sync.writeFileSync(this.toString(), data, {
        encoding: 'utf-8',
      });
    } catch (e) {
      throw new PathError('Failed to write file', this, e as Error);
    }
  }

  /**
   * Read the file at this path as JSON.
   */
  async readJson<T>(): Promise<T> {
    const data = await this.read();
    return JSON.parse(data) as T;
  }

  /**
   * Read the file at this path as JSON.
   * Sync API.
   */
  readJsonSync<T>(): T {
    const data = this.readSync();
    return JSON.parse(data) as T;
  }

  /**
   * Write the file at this path as JSON.
   * @param data
   */
  async writeJson(data: unknown): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await this.write(json);
  }

  /**
   * Write the file at this path as JSON.
   * Sync API.
   * @param data
   */
  writeJsonSync(data: unknown): void {
    const json = JSON.stringify(data, null, 2);
    this.writeSync(json);
  }

  /**
   * Read the file at this path as CSV.
   * @param delimiter
   * @param trim_space
   * @param skip_head
   * @param converter
   */
  async readCsv<T = string[]>({
    delimiter = ',',
    trim_space = false,
    skip_head = false,
    converter = ((row) => row as T) as CsvConverter<T>,
  } = {}): Promise<T[]> {
    const data = await this.read();
    const rows = data
      .split('\n')
      .filter((line) => line.length > 0)
      .filter((_, i) => !skip_head || i > 0)
      .map((line) => {
        const segs = line.split(delimiter);
        if (trim_space) {
          return segs.map((seg) => seg.trim());
        } else {
          return segs;
        }
      })
      .filter((row) => row.length > 0);
    return Promise.all(rows.map((row) => converter(row)));
  }
}

export type CsvConverter<T> = (row: string[]) => Promise<T> | T;
