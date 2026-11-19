// react-router (v7) needs TextEncoder/TextDecoder, which jsdom doesn't expose.
import { TextDecoder, TextEncoder } from 'node:util'

Object.assign(globalThis, { TextEncoder, TextDecoder })
