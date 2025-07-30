// Script de prueba para verificar el endpoint del equipo
// Ejecutar en la consola del navegador

async function testTeamEndpoint() {
  console.log('=== TESTING TEAM ENDPOINT ===');
  
  // Parámetros de prueba
  const teamId = 22;
  const leagueId = 39;
  
  console.log(`Testing team ID: ${teamId}, League: ${leagueId}`);
  
  try {
    // 1. Probar el endpoint del equipo
    console.log('\n1. Testing team endpoint...');
    const teamEndpoint = `/api/teamconstructorsbyleague?id=${teamId}&league_id=${leagueId}`;
    console.log('Endpoint:', teamEndpoint);
    
    const teamResponse = await fetch(teamEndpoint);
    console.log('Response status:', teamResponse.status);
    
    if (!teamResponse.ok) {
      console.error('Team endpoint failed:', teamResponse.status, teamResponse.statusText);
      return;
    }
    
    const teamData = await teamResponse.json();
    console.log('Team data:', teamData);
    
    // 2. Verificar estructura de datos
    console.log('\n2. Checking data structure...');
    console.log('Has team_constructor:', !!teamData.team_constructor);
    console.log('Has team:', !!teamData.team);
    console.log('Has pilots:', !!teamData.pilots);
    
    if (teamData.team_constructor) {
      console.log('Team constructor data:', teamData.team_constructor);
    }
    
    // 3. Probar el endpoint de subasta
    console.log('\n3. Testing auction endpoint...');
    const auctionEndpoint = `/api/auctions/by-item?item_type=team_constructor&item_id=${teamId}&league_id=${leagueId}`;
    console.log('Auction endpoint:', auctionEndpoint);
    
    const auctionResponse = await fetch(auctionEndpoint);
    console.log('Auction response status:', auctionResponse.status);
    
    if (auctionResponse.ok) {
      const auctionData = await auctionResponse.json();
      console.log('Auction data:', auctionData);
    } else {
      console.log('No active auction found (this is normal if no auction exists)');
    }
    
    // 4. Probar el endpoint de player by league
    console.log('\n4. Testing player by league endpoint...');
    const playerId = localStorage.getItem('player_id');
    if (playerId) {
      const playerEndpoint = `/api/playerbyleague?player_id=${playerId}&league_id=${leagueId}`;
      console.log('Player endpoint:', playerEndpoint);
      
      const playerResponse = await fetch(playerEndpoint);
      console.log('Player response status:', playerResponse.status);
      
      if (playerResponse.ok) {
        const playerData = await playerResponse.json();
        console.log('Player data:', playerData);
      }
    }
    
    console.log('\n=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Ejecutar la prueba
testTeamEndpoint(); 