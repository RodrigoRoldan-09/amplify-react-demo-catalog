import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

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
      // Público puede leer
      allow.guest().to(['read']),
      // Solo usuarios autenticados pueden crear, actualizar y eliminar
      allow.authenticated().to(['create', 'update', 'delete', 'read'])
    ]),
     
  Tag: a
    .model({
      name: a.string().required(),
      color: a.string().required(),
      demos: a.hasMany('DemoTag', 'tagId')
    })
    .authorization((allow) => [
      // Público puede leer
      allow.guest().to(['read']),
      // Solo usuarios autenticados pueden crear, actualizar y eliminar
      allow.authenticated().to(['create', 'update', 'delete', 'read'])
    ]),
     
  DemoTag: a
    .model({
      demoId: a.id().required(),
      tagId: a.id().required(), 
      demo: a.belongsTo('Demo', 'demoId'),
      tag: a.belongsTo('Tag', 'tagId')
    })
    .authorization((allow) => [
      // Público puede leer
      allow.guest().to(['read']),
      // Solo usuarios autenticados pueden crear, actualizar y eliminar
      allow.authenticated().to(['create', 'update', 'delete', 'read'])
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});