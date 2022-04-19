const AWS= require('aws-sdk');

AWS.config.update({ 
    region:'us-east-1'
});

const dynamodb= new AWS.DynamoDB.DocumentClient();
const tableName= 'customers';
const customerPath='/customer';
const customersPath='/customers';
const healthPath='/health';

exports.handler= async function(event){
    console.log('Request event: ', event);
    let response;
    switch(true){
        case event.httpMethod ==='GET' && event.path === healthPath:
            response= buildResponse(200);
            break;
        case event.httpMethod === 'GET' && event.path === customerPath:
            
            response= await getCustomer(event.queryStringParameters.id, event.queryStringParameters.lname);
            break;
        case event.httpMethod ==='GET' && event.path === customersPath:
            response= await getCustomers();
            break;
        case event.httpMethod === 'POST' && event.path === customerPath:
            response= await createCustomer(JSON.parse(event.body));
            break;
        case event.httpMethod ==='DELETE' && event.path === customerPath:
            response= await deleteCustomer(event.queryStringParameters.id, event.queryStringParameters.lname);
            break;
        default:
            response= buildResponse(404, '404 not found');
    }
    return response;
}



async function getCustomer(id, lname) {
    
    const params = {
      TableName: tableName,
      Key: {
        "id": id,
        "lname":lname
      }
    }
    return await dynamodb.get(params).promise().then((response) => {
      return buildResponse(200, response.Item);
    }, (error) => {
      console.error(error);
    });
  }

async function getCustomers(){
    const params={
        TableName: tableName
    }
    const allCustomers= await scanDynamoRecords(params,[]);
    const body= {
        customers:allCustomers
    }
    return buildResponse(200, body);
}

async function createCustomer(requestBody){
    const params={
        TableName: tableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(()=>{
        const body={
            Operation:'CREATE',
            Message: 'SUCESS',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) =>{
        console.error(error);
    
    })
}

async function deleteCustomer(id, lname) {
    const params = {
      TableName: tableName,
      Key: {
        "id": id,
        "lname":lname
      },
      ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
      const body = {
        Operation: 'DELETE',
        Message: 'SUCCESS',
        Item: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error(error);
    })
  }

async function scanDynamoRecords(scanParams, itemArray) {
    try {
      const dynamoData = await dynamodb.scan(scanParams).promise();
      itemArray = itemArray.concat(dynamoData.Items);
      if (dynamoData.LastEvaluatedKey) {
        scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
        return await scanDynamoRecords(scanParams, itemArray);
      }
      return itemArray;
    } catch(error) {
      console.error(error);
    }
  }

function buildResponse(statusCode, body){
    return {
        statusCode: statusCode,
        headers:{
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
    }
}