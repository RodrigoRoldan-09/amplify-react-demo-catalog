import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/* This schema creates a Demo model to showcase your AWS projects with tags.
Each demo requires the following fields:
- projectName: The name of your project
- githubLink: Link to the project's GitHub repository  
- projectLink: Link to the deployed project
- imageUrl: URL for the project's screenshot or preview image
- tags: Many-to-many relationship with predefined tags */

const schema = a.schema({
  Demo: a
    .model({
      projectName: a.string(),
      githubLink: a.string(), 
      projectLink: a.string(),
      imageUrl: a.string(),
      tags: a.hasMany('DemoTag', 'demoId')
    })
    .authorization((allow) => [
      // Permitir acceso público completo por ahora para debuggear
      allow.publicApiKey()
    ]),
     
  Tag: a
    .model({
      name: a.string().required(),
      color: a.string().required(), // Added color field for tag colors
      demos: a.hasMany('DemoTag', 'tagId')
    })
    .authorization((allow) => [
      // Permitir acceso público completo por ahora para debuggear
      allow.publicApiKey()
    ]),
     
  DemoTag: a
    .model({
      demoId: a.id().required(),
      tagId: a.id().required(), 
      demo: a.belongsTo('Demo', 'demoId'),
      tag: a.belongsTo('Tag', 'tagId')
    })
    .authorization((allow) => [
      // Permitir acceso público completo por ahora para debuggear
      allow.publicApiKey()
    ]),

  // Modelo para usuarios predefinidos (opcional por ahora)
  AdminUser: a
    .model({
      username: a.string().required(),
      email: a.string().required(),
      password: a.string().required(),
      isActive: a.boolean().default(true)
    })
    .authorization((allow) => [
      allow.publicApiKey()
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/* After deploying this schema, you'll need to manually add the 5 predefined tags to your database:
1. Games
2. ML  
3. Analytics
4. M&E
5. Generative AI

And add the 2 admin users:
1. Username: rodes, Password: remr020605
2. Username: reno, Password: !Reno1990.

You can do this through the AWS Console or by creating a script to populate initial data. */