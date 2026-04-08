import React, { useState } from "react";
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
SafeAreaView
} from "react-native";
import { router } from "expo-router";

export default function TripPlanner(){

const [city,setCity] = useState("")
const [days,setDays] = useState("")
const [interests,setInterests] = useState("")

const generateTrip = () => {

const message = `Plan ${days} days in ${city} with interests ${interests}`

router.push({
pathname:"/(tabs)/chat",
params:{prompt:message}
})

}

return(

<SafeAreaView style={styles.container}>

<Text style={styles.title}>AI Trip Planner</Text>

<Text style={styles.label}>City</Text>
<TextInput
style={styles.input}
placeholder="Cappadocia"
placeholderTextColor="#777"
value={city}
onChangeText={setCity}
/>

<Text style={styles.label}>Days</Text>
<TextInput
style={styles.input}
placeholder="2"
placeholderTextColor="#777"
value={days}
onChangeText={setDays}
keyboardType="numeric"
/>

<Text style={styles.label}>Interests</Text>
<TextInput
style={styles.input}
placeholder="nature, history, food"
placeholderTextColor="#777"
value={interests}
onChangeText={setInterests}
/>

<TouchableOpacity style={styles.button} onPress={generateTrip}>
<Text style={styles.buttonText}>Generate Trip</Text>
</TouchableOpacity>

</SafeAreaView>

)

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#0B0B0B",
padding:20
},

title:{
color:"white",
fontSize:30,
fontWeight:"bold",
marginBottom:30
},

label:{
color:"#AAA",
marginBottom:6
},

input:{
backgroundColor:"#171717",
color:"white",
padding:14,
borderRadius:12,
marginBottom:20
},

button:{
backgroundColor:"#9BE000",
padding:18,
borderRadius:14,
alignItems:"center"
},

buttonText:{
fontWeight:"bold",
fontSize:16
}

})