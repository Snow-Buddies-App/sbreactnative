import { useState } from "react";
import { Text, View, Button, Alert } from "react-native";
import { useForm, FormProvider, SubmitHandler, SubmitErrorHandler, FieldValues } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {TextInput} from "./baseComponents/textInput";
import * as yup from "yup";

const schema = yup.object({
    firstName: yup.string().required(),
    lastName: yup.string().required(),
}).required();

type FormValues = {
    firstName: string;
    lastName: string;
}

export default function BaseForm() {

    const {...methods} = useForm(
        {
            resolver: yupResolver(schema),
            defaultValues: {
                firstName: "First Name",
                lastName: "Last Name",
            }
        }
    );

    const onSubmit: SubmitHandler<FieldValues> = (data) => console.log(data);

    const [formError, setError] = useState<Boolean>(false);

    const onError: SubmitErrorHandler<FormValues> = (errors, e) => console.log(errors);

    const firstNameRules = { 
        required: 'First name is required!',
        minLength: {
            value: 2, 
            message: 'First name too short!'
        },
        maxLength: {
            value: 20, 
            message: 'First name too long!'
        }
    };

    const lastNameRules = { 
        required: 'Last name is required!', 
        minLength: {
            value: 2, 
            message: 'Last name too short!'
        }, 
        maxLength: {
            value: 20, 
            message: 'Last name too long!'
        }
    };

    return (
        <View>
            <FormProvider {...methods}>
                <TextInput
                    name="firstName"
                    label="First Name"
                    defaultValue=""
                    rules={firstNameRules}
                />
                <TextInput
                    name="lastName"
                    label="Last Name"
                    defaultValue=""
                    rules={lastNameRules}
                />
            </FormProvider>
            <Button title="Submit" onPress={methods.handleSubmit(onSubmit, onError)} />
        </View>
    )
}