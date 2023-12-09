import { Text, View, TextInput, Button, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";

export default function BaseForm() {
    const { control, handleSubmit, formState: { errors }, } = useForm(
        {
            defaultValues: {
                firstName: "",
                lastName: "",
                email: ""
            }
        }
    );
    const onSubmit = (data) => console.log(data);

    return (
        <View>
            <Controller
                control={control}
                rules={{
                    required: true,
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        placeHolder="First Name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />  
                )}
                name="firstName"
            />

            
        </View>
    )
}