declare module 'react-markdown' {
  import * as React from 'react';
  import { PluggableList } from 'unified';
  import { Options as RehypeReactOptions } from 'rehype-react';
  import { Root } from 'hast';
  import { Components } from 'react-markdown/lib/ast-to-react';

  export interface ReactMarkdownProps {
    /**
     * The Markdown text to parse
     */
    children: string;
    /**
     * Enable GitHub Flavored Markdown (GFM)
     * @default false
     */
    remarkPlugins?: PluggableList;
    /**
     * Enable rehype plugins
     */
    rehypePlugins?: PluggableList;
    /**
     * Custom components to use for HTML elements
     */
    components?: Components;
    /**
     * Skip the main element wrapper
     * @default false
     */
    skipHtml?: boolean;
    /**
     * Allow HTML in Markdown
     * @default false
     */
    includeElementIndex?: boolean;
    /**
     * Custom URL transformation
     */
    urlTransform?: (url: string) => string;
    /**
     * Allow dangerous HTML
     * @default false
     */
    allowDangerousHtml?: boolean;
    /**
     * Allow dangerous protocols in links and images
     * @default false
     */
    allowDangerousProtocol?: boolean;
    /**
     * Custom components
     */
    unwrapDisallowed?: boolean;
    /**
     * Link target
     */
    linkTarget?: string | ((url: string) => string);
    /**
     * Transform links
     */
    transformLinkUri?: (uri: string, children?: any, title?: string) => string;
    /**
     * Transform images
     */
    transformImageUri?: (uri: string, children?: any, title?: string, alt?: string) => string;
  }

  /**
   * Renders markdown as React components
   */
  declare const ReactMarkdown: React.FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}
