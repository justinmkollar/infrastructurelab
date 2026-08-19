import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const themeSchema = z.object({
  lightBackground: z.string().default('#f4f4f0'),
  lightText: z.string().default('#171717'),
  lightMuted: z.string().default('#62686b'),
  lightSmall: z.string().default('#7d8183'),
  lightLine: z.string().default('#c8cbcc'),
  lightSoft: z.string().default('#e8e9e5'),
  darkBackground: z.string().default('#1d2028'),
  darkText: z.string().default('#f3f2f2'),
  darkMuted: z.string().default('#a9adaa'),
  darkSmall: z.string().default('#8d9395'),
  darkLine: z.string().default('#46515a'),
  darkSoft: z.string().default('#252a31')
}).optional();

const heroSchema = z.object({
  type: z.enum(['none', 'image', 'atlas-globe']).default('none'),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonUrl: z.string().optional(),
  intro: z.string().optional()
}).optional();

const imageItemSchema = z.object({
  image: z.string(),
  alt: z.string().default(''),
  caption: z.string().optional()
});

const linkItemSchema = z.object({
  label: z.string(),
  url: z.string(),
  newWindow: z.boolean().default(false)
});

const moduleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    heading: z.string().optional(),
    body: z.string().default(''),
    images: z.array(imageItemSchema).default([]),
    links: z.array(linkItemSchema).default([])
  }),
  z.object({
    type: z.literal('image'),
    image: z.string(),
    alt: z.string().default(''),
    caption: z.string().optional(),
    size: z.enum(['narrow', 'wide', 'full']).default('wide')
  }),
  z.object({
    type: z.literal('gallery'),
    heading: z.string().optional(),
    images: z.array(imageItemSchema).default([])
  }),
  z.object({
    type: z.literal('links'),
    heading: z.string().optional(),
    items: z.array(linkItemSchema).default([])
  }),
  z.object({ type: z.literal('accordion'), heading: z.string().optional(), intro: z.string().optional(), items: z.array(z.object({ title: z.string(), body: z.string().default('') })).default([]) }),
  z.object({ type: z.literal('steps'), heading: z.string().optional(), intro: z.string().optional(), items: z.array(z.object({ title: z.string(), body: z.string().default('') })).default([]) }),
  z.object({ type: z.literal('updates'), heading: z.string().optional(), items: z.array(z.object({ date: z.string().optional(), title: z.string(), body: z.string().default('') })).default([]) })
]);

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(), contributors: z.array(z.string()).default([]), dateLabel: z.string(), order: z.number().default(100), published: z.boolean().default(true), description: z.string().default(''), funding: z.string().optional(), duration: z.string().optional(), page: z.boolean().default(false), externalUrl: z.string().optional(), theme: themeSchema, hero: heroSchema, modules: z.array(moduleSchema).default([])
  })
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    authors: z.array(z.string()).default([]), title: z.string(), details: z.string(), type: z.string(), date: z.string().optional(), order: z.number().default(100), published: z.boolean().default(true), url: z.string().optional(), abstract: z.string().default(''), keywords: z.array(z.string()).default([])
  })
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(), title: z.string(), institution: z.string(), order: z.number().default(100), published: z.boolean().default(true), photo: z.string().optional(), photoAlt: z.string().optional(), bio: z.string().default(''), email: z.string().optional(), cv: z.string().optional(), cvFile: z.string().optional(), links: z.array(z.object({ label: z.string(), url: z.string() })).default([])
  })
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({ title: z.string(), description: z.string().optional(), published: z.boolean().default(true), order: z.number().default(100), modules: z.array(moduleSchema).default([]) })
});

export const collections = { research, publications, people, pages };
