import { Fragment } from 'react';
import type { SerializedValue } from '../../types/runtime';

interface ConsoleValueProps {
  value: SerializedValue;
  /** Top-level strings print bare, like a browser console; nested ones quote. */
  topLevel?: boolean;
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Renders one serialized value as compact, readable text. */
export function ConsoleValue({ value, topLevel = false }: ConsoleValueProps) {
  switch (value.kind) {
    case 'string':
      return topLevel ? (
        <span className="v-string-bare">{value.value}</span>
      ) : (
        <span className="v-string">{quote(value.value)}</span>
      );

    case 'literal':
      return <span className="v-literal">{value.text}</span>;

    case 'function':
      return <span className="v-function">{value.label}</span>;

    case 'error':
      return (
        <span className="v-error-value">
          {value.name}: {value.message}
        </span>
      );

    case 'circular':
      return <span className="v-meta">[Circular]</span>;

    case 'hole':
      return <span className="v-meta">empty</span>;

    case 'truncated':
      return <span className="v-meta">{value.label}</span>;

    case 'unserializable':
      return <span className="v-meta">{value.text}</span>;

    case 'array':
      return (
        <span>
          <span className="v-punct">[</span>
          {value.items.map((item, index) => (
            <Fragment key={index}>
              {index > 0 && <span className="v-punct">, </span>}
              <ConsoleValue value={item} />
            </Fragment>
          ))}
          {value.extra > 0 && <span className="v-meta">, …{value.extra} more</span>}
          <span className="v-punct">]</span>
        </span>
      );

    case 'collection':
      return (
        <span>
          <span className="v-ctor">
            {value.ctor}({value.size})
          </span>{' '}
          <span className="v-punct">{'{'}</span>
          {value.items.map((item, index) => (
            <Fragment key={index}>
              {index > 0 && <span className="v-punct">, </span>}
              {value.ctor === 'Map' && item.kind === 'array' ? (
                <>
                  <ConsoleValue value={item.items[0]} />
                  <span className="v-punct"> {'=>'} </span>
                  <ConsoleValue value={item.items[1]} />
                </>
              ) : (
                <ConsoleValue value={item} />
              )}
            </Fragment>
          ))}
          {value.extra > 0 && <span className="v-meta">, …{value.extra} more</span>}
          <span className="v-punct">{'}'}</span>
        </span>
      );

    case 'object':
      return (
        <span>
          {value.ctor && <span className="v-ctor">{value.ctor} </span>}
          <span className="v-punct">{'{'}</span>
          {value.entries.map((entry, index) => (
            <Fragment key={entry.key}>
              {index > 0 && <span className="v-punct">,</span>}{' '}
              <span className="v-key">
                {IDENTIFIER.test(entry.key) ? entry.key : quote(entry.key)}
              </span>
              <span className="v-punct">: </span>
              <ConsoleValue value={entry.value} />
            </Fragment>
          ))}
          {value.extra > 0 && <span className="v-meta">, …{value.extra} more</span>}
          <span className="v-punct">{value.entries.length > 0 ? ' }' : '}'}</span>
        </span>
      );
  }
}
