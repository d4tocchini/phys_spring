
const {
    E: M_E,
    sqrt,
    abs,
    cos,    sin,
    cosh,   sinh,
} = Math;

const   spring_map = new Map();
const   spring_system_map = new Map();
let     CK_DEFAULT = 0;
let     C_DEFAULT = 12;
let     K_DEFAULT = 180;

function spring_register(_c, _k) {
    const c = _c || C_DEFAULT;
    const k = _k || K_DEFAULT;
    const ck = spring_ck(c, k);
    spring_map.has(ck) ? spring_map.get(ck) : _spring_register(ck,c,k);
    return ck;
}

function spring_ck(c, k) {
    return (c|0)**2 - ((k|0)<<2);
}

function spring_set_default(c, k) {
    const ck = spring(c, k);
    _spring_set_default(ck, c, k);
    return ck;
}

function _spring_register(_ck, c, k) {
    _spring_set_default(_ck, c, k);
    _spring_register = function(_ck, c, k) {
        const fun = _spring_fun_branch[(_ck >>> 31)](c, k, _ck);
        spring_map.set(_ck, fun);
        return fun;
    }
    return _spring_register(_ck, c, k);
}

function _spring_set_default(ck, c, k) {
    CK_DEFAULT = ck;
    C_DEFAULT = c;
    K_DEFAULT = k;
}

const _spring_fun_branch = [
    _spring_fun_pos,
    _spring_fun_neg,
]

function _spring_fun_pos(c,k,_ck) {
    const _sq = sqrt(_ck);
    const _cos = cosh;
    const _sin = sinh;
    return function (v,t) {
        const _t2 = t / 2.0;
        const _sq_t2 = _sq * _t2;
        const x = 1.0 + M_E**( -(c * _t2) ) *
                ( -_cos(_sq_t2) - ( _sin(_sq_t2) * (c - (v * 2.0)) / _sq ) );
        return x;
    }
}
function _spring_fun_neg(c,k,_ck) {
    const _sq = sqrt(sign_invert(_ck));
    const _cos = cos;
    const _sin = sin;
    return function (v,t) {
        const _t2 = t / 2.0;
        const _sq_t2 = _sq * _t2;
        const x = 1.0 + M_E**( -(c * _t2) ) *
                ( -_cos(_sq_t2) - ( _sin(_sq_t2) * (c - (v * 2.0)) / _sq ) );
        return x;
    }
}

function spring_system(name, ontick, onrest) {
    const   ACTIVE = 1;
    const   DX_MIN = .00001;
    let     VX0 = -1.0 // simulates initial surface tension
    let     TIME_STEP = 12;
    const   props = new Map();
    // const   keys = [];
    // const   keys_l = 0;
    // const   keys_active_l = 0;
    // const   keys_rest_l = 0;
    const   props_active = [];
    let     props_active_l = 0;
    let     props_changed = [];
    let     props_changed_l = 0;
    let     _is_rested = 1;
    let     _t_prev = 0;
    let     _frame = 0;

    let sys = {
        set_step,
        get_step,
        spring,
        val,
        int,
        to,
        update,
        destroy,
        clear,
        get_prop,
        iterate_changes,
    }
    spring_system_map.set(name, sys)
    return sys;
    function set_step(step) {TIME_STEP = step;}
    function get_step()      {return TIME_STEP;}
    function spring(key, c, k) {
        get_prop(key).ck = spring_register(c, k);
    }
    function val(key) {
        return props.get(key).y;
    }
    function get_prop(key) {
        return props.get(key)
    }
    function int(key, y) {
        return _register_prop(key, JSON.parse(`{
"ck":${CK_DEFAULT},
"flags":0.0,
"y0":${y},
"y1":${y},
"y":${y},
"x0":0.0,
"x1":1.0,
"x":0.0,
"t":0,
"dx":0.0,
"vx0":${VX0},
"vx":0.0}`));
    }

    function _register_prop(key,prop) {
        // if (!props.has(key)) {
        //     keys[keys_l++] = key;
        // }
        props.set(key, prop);
        return prop;
    }

    function to(key, y1) {
        const prop = get_prop(key);
        if (prop.y1 != y1) {
            if (prop.flags & ACTIVE)
                _change_target(key, prop, y1);
            else
                _set_target(key, prop, y1);
            prop.y1 = y1;
            prop.t = 0;
            prop.x = 0.0;
            prop.x1 = 1.0;
        }
    }
    //  TODO:
    // const dist = abs(y1 - y);
    // if (dist <= DY_MIN && dy <= DY_MIN)

    function _change_target(key, prop,y1) {
        const y0 = prop.y;
        prop.vx *= (prop.y1 - prop.y0)/ (y1 - y0);
        prop.vx0 = prop.vx;
        prop.y0 = y0;
    }

    function _set_target(key, prop,y1) {
        props_active[props_active_l++] = key;
        prop.flags = ACTIVE;
        prop.vx = VX0;
        prop.vx0 = VX0;
        prop.y0 = prop.y;
    }   // TODO: simulats initial friction

    function update() {
        if (props_active_l > 0) {
            _is_rested = 0;
            _update(TIME_STEP);
            ontick(iterate_changes, iterate_rests, props_changed_l);
        }
        else if (_is_rested === 0) {
            _is_rested = 1;
            onrest();
        }
    }
                          // fn(key, val, i) // return false to stop
    function iterate_changes(fn) {
        let i = 0;
        while (i < props_changed_l) {
            const key = props_changed[i++];
            if ( fn(key, val(key), i) === false )
                return
        }
    }
    function iterate_rests(fn) {
        let i = 0;
        while (i < props_changed_l) {
            const key = props_changed[i++];
            if ( fn(key, val(key), i) === false )
                return
        }
    }

    function _update(dt_ms) {
        ++_frame;
        let i = props_active_l;
        const dt = dt_ms / 1000.0;

        // ...
        props_changed = props_active.slice();
        props_changed_l = props_active_l;

        while (i)
            _update_key(props_active[--i],dt,i);
    }
    function _update_key(key,dt,i) {
        const prop = props.get(key);
        prop.t += dt;

        const spring_fn = spring_map.get(prop.ck);
        const x = spring_fn(prop.vx0, prop.t);
        const dx = x - prop.x;

        if (abs(dx) + abs(dx) <= DX_MIN) {
            const x1 = prop.x1;
            prop.flags = 0|0;
            prop.dx = x1 - x;
            prop.x = x1;
            prop.y = prop.y1;
            prop.vx = 0.0;
            prop.vx0 = 0.0;
            const last = --props_active_l;
            if (i !== last)
                props_active[i] = props_active[last];
            props_active.length = last
        }
        else {
            prop.flags |= 2;
            prop.x = x;
            prop.y = map_01range(x, prop.y0, prop.y1);
            prop.dx = dx;
            prop.vx = dx / dt
        }
    }

    // function _time_delta() {
        // _time_delta = function() {
        //     const t_prev = _t_prev;
        //     const t = _t_prev = time_ms();
        //     return t - t_prev;
        // }
    //     return TIME_STEP;
    // }

    function destroy() {
        clear();
        spring_system_map.delete(name);
        sys = null;
    }

    function clear() {
        props.clear();
        props_active.length = props_active_l = 0;
        props_changed.length = props_changed_l = 0
        _t_prev = 0;
        _frame = 0;
        _is_rested = 1;
    }
}

function time_ms() {
    return performance.now(0)|0;
}

function map_range(input, in0, in1, out0, out1) {
    const scale = (input - in0) / (in1 - in0);
    return out0 + scale * (out1 - out0);
}

function map_01range(input, out0, out1) {
    return out0 + input * (out1 - out0);
}

function sign_invert(x) {
    return (x ^ -1) + 1;
}

module.exports = {
    spring_register,
    spring_set_default,
    spring_system,
    spring_system_map,
    time_ms,
    map_range,
    map_01range,
    sign_invert,
}

