import { Text, View, TextInput, Button, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
    firstName: yup.string().required(),
    lastName: yup.string().required(),
}).required();

type FormData = {
    firstName: string
    lastName: string
}

export default function BaseForm() {
    const { control, handleSubmit, formState: { errors }, } = useForm(
        {
            defaultValues: {
                firstName: "",
                lastName: "",
            },
            resolver: yupResolver(schema),
        }
    );
    const onSubmit = (data:FormData) => console.log(data);

    return (
        <View>
            <Controller
                control={control}
                rules={{
                    required: true,
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        placeholder="First Name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />  
                )}
                name="firstName"
            />
            <Controller
                control={control}
                rules={{
                    required: true,
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        placeholder="Last Name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />  
                )}
                name="lastName"
            />
            <Button title="Submit" onPress={handleSubmit(onSubmit)} />
        </View>
    )
}