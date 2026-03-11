module.exports = {
  operato: {
    baseUrl: 'http://localhost:9500/rest',
  },
  /** 
   * Domain Primary Colulumn Configuration
   * support 
   * Types : "int","int2","int4","int8","integer","tinyint","smallint","mediumint","bigint",'uuid'
   * Strategy = 'uuid','rowid',"increment","identity"
   * by defualt use uuid auto generated id
   * ie.
   *  domainPrimaryOption:{
   *   type:'int8',
   *   strategy:null
   * }
   */
  domainPrimaryOption: {
    type: 'int8',
    strategy: null
  }
}