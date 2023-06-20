export interface Config {
    harbor?: {
      /**
       * Harbor baseUrl
       */
      baseUrl?: string;
      /**
       * Harbor username
       */
      username?: string;
      /**
       * Harbor password
       * @visibility secret
       */
      password?: string;
    };
  }