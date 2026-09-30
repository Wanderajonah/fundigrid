const { getSupabase } = require("../config/supabase");

class QueryResult extends Array {
  constructor(rows, model) {
    // Tolerate `new QueryResult(length)` (Array species construction) as well
    // as the normal `new QueryResult(rows, model)` call.
    super(...(Array.isArray(rows) ? rows : typeof rows === "number" ? Array(rows) : []));
    this._model = model;
  }

  // Derived operations (map/filter/slice/...) must return plain arrays:
  // Array subclasses are rebuilt via `new QueryResult(length)`, which this
  // constructor cannot handle, and those results never need `.populate()`.
  static get [Symbol.species]() {
    return Array;
  }

  async populate(field, projection) {
    const refMap = this._model._refs || {};
    const refTableName = refMap[field];
    if (!refTableName) return this;

    const ids = [...new Set(this.map((doc) => doc[field]).filter(Boolean))];
    if (ids.length === 0) return this;

    const supabase = getSupabase();
    const { data } = await supabase.from(refTableName).select("*").in("id", ids);
    const lookup = {};
    (data || []).forEach((row) => { lookup[row.id] = row; });

    for (let i = 0; i < this.length; i++) {
      const val = this[i][field];
      if (val && lookup[val]) this[i][field] = lookup[val];
    }
    return this;
  }
}

class Model {
  static _table = "";
  static _refs = {};
  static _defaults = {};

  static _db() { return getSupabase(); }

  static _hydrate(row) {
    if (!row) return null;
    const doc = { ...row };
    doc.save = async () => {
      const { error } = await this._db()
        .from(this._table)
        .update(doc)
        .eq("id", doc.id);
      if (error) throw error;
      return doc;
    };
    return doc;
  }

  static async find(filter = {}) {
    let q = this._db().from(this._table).select("*");
    for (const [k, v] of Object.entries(filter)) {
      if (v === null) q = q.is(k, null);
      else if (typeof v === "object" && !Array.isArray(v)) {
        // skip complex filters for now
      } else q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw error;
    const results = new QueryResult((data || []).map((r) => this._hydrate(r)), this);
    return results;
  }

  static async findOne(filter = {}) {
    let q = this._db().from(this._table).select("*").limit(1);
    for (const [k, v] of Object.entries(filter)) {
      if (v === null) q = q.is(k, null);
      else q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data && data[0] ? this._hydrate(data[0]) : null;
  }

  static async findById(id) {
    if (!id) return null;
    const { data, error } = await this._db()
      .from(this._table)
      .select("*")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    return data && data[0] ? this._hydrate(data[0]) : null;
  }

  static async create(data) {
    const row = { ...this._defaults, ...data };
    const { data: created, error } = await this._db()
      .from(this._table)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return this._hydrate(created);
  }

  static async insertMany(docs) {
    const rows = docs.map((d) => ({ ...this._defaults, ...d }));
    const { data, error } = await this._db()
      .from(this._table)
      .insert(rows)
      .select();
    if (error) throw error;
    return (data || []).map((r) => this._hydrate(r));
  }

  static async findOneAndUpdate(filter, update, options = {}) {
    const existing = await this.findOne(filter);
    if (existing) {
      const { data, error } = await this._db()
        .from(this._table)
        .update(update)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return options.new ? this._hydrate(data) : this._hydrate(existing);
    }
    if (options.upsert) {
      return this.create({ ...filter, ...update });
    }
    return null;
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const { data, error } = await this._db()
      .from(this._table)
      .update(update)
      .eq("id", id)
      .select();
    if (error) throw error;
    const row = data && data[0] ? data[0] : null;
    if (!row) return null;
    return options.new !== false ? this._hydrate(row) : row;
  }

  static async deleteOne(filter) {
    let q = this._db().from(this._table).delete();
    for (const [k, v] of Object.entries(filter)) {
      q = q.eq(k, v);
    }
    const { error } = await q;
    if (error) throw error;
  }

  static async countDocuments(filter = {}) {
    let q = this._db().from(this._table).select("id", { count: "exact", head: true });
    for (const [k, v] of Object.entries(filter)) {
      q = q.eq(k, v);
    }
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  }
}

module.exports = { Model, QueryResult };
