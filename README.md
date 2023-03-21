
# 使用Springboot和angular开发web项目

## 这个教程是面对谁的

==初学者==，但前提是你熟悉各种java，nodejs，angular环境的安装，初步熟悉Java代码，明白JPA、JDBC等数据库交互的大概原理和使用方法

# 后端部分

## springboot项目创建

准备spring的依赖和项目POM参数

在[spring快速开始界面](https://start.spring.io/)，选择你的参数

可以点击explore查看具体的pom文件参数，也可以点击generate直接下载工程文件

## 实体类

创建model，与数据库里的数据产生映射

```java
@Entity
public class Employee implements Serializable {
//    @Id make it to be the primary key
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private Long id;
    private String name;
    private String email;
    private String jobTitle;
    private String phone;
    private String imageUrl;
    @Column(nullable = false, updatable = false)
    private String employeeCode;
}
```

有几个注解你要认识

- @Entity
`@Entity` make sure that this class is mapped to any database that we have configured on the classpath
- @Id
告诉springboot这是Id
- @GeneratedValue(strategy = GenerationType.AUTO)
告诉spring用何种方式生成这些值
-  @Column(nullable = false, updatable = false)
这是告诉Spring注解的这一行在数据库中不能为空，一旦赋值也不能被更新

接下来配置一些数据库选项

```properties
#MySQL Configuration
spring.datasource.url=jdbc:mysql://localhost::3306/employeemanager
spring.datasource.username=root
spring.datasource.password=123456
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update
#设置数据库引擎
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL5Dialect
```

### 会出现的问题

springboot首先会报`CLIENT_PLUGIN_AUTH is required.`

原因如下，是版本的问题

> The Spring Boot project creator will download the latest MySQL connector (currently Version 8) so if you are running an older version of MySQL then the CLIENT_PLUGIN_AUTH error probably results from this.

你需要在pom.xml文件中修改mysql连接的版本

```xml
<dependency>
   <groupId>mysql</groupId>
   <artifactId>mysql-connector-java</artifactId>
   <version>5.1.6</version>
</dependency>
```

然后确保`#MySQL Configuration`中有

```properties
spring.datasource.driver-class-name=com.mysql.jdbc.Driver
```

即可连接成功

如果你的数据库已经存在，就可以正确连接，并且Hibernat会帮你自动创建表，表名就是你的实体类名称

```shell
Hibernate: create table employee (id bigint not null, email varchar(255), employee_code varchar(255) not null, image_url varchar(255), job_title varchar(255), name varchar(255), phone varchar(255), primary key (id)) engine=MyISAM
Hibernate: create table hibernate_sequence (next_val bigint) engine=MyISAM
Hibernate: insert into hibernate_sequence values ( 1 )
```

### 创建repo仓库

我们需要一种方式来保存这个表中的内容，Jpa就是我们的mechanism

建立一个接口，接口拓展Jpa仓库，我们需要告诉Jpa，这个仓库是为哪个类准备的，并且告诉它主键的类型

```java
public interface EmployeeRepo extends JpaRepository<employee,Long> {
}
```

### 创建Service

有了接口，我们需要使用服务，这样我们就可以在controller中使用它对仓库进行操作

```java
@Service
@Transactional
public class EmployeeService {
    private final EmployeeRepo employeeRepo;

    @Autowired
    public EmployeeService(EmployeeRepo employeeRepo) {
        this.employeeRepo = employeeRepo;
    }
}
```

这里有几点

1. @Service

这是声明这个类是服务

2. @Autowired

注入employee对象

3. @Transactional

使用这个注解的类或者方法表示该类里面的所有方法或者这个方法的事务由spring处理，来保证事务的[原子性](https://so.csdn.net/so/search?q=原子性&spm=1001.2101.3001.7020)，即是方法里面对数据库操作，如果失败则spring负责回滚操作，成功则提交操作。

4. 因为我们要在服务中对仓库进行操作，所以也要引入仓库对象employeeRepo

接下来我们就可以在服务类中写一些查询用户的代码，例如添加用户

```java
//添加用户
    public Employee addEmp(Employee employee){
        employee.setEmployeeCode(UUID.randomUUID().toString());
        return employeeRepo.save(employee);
    }
//查询所有用户
    public List<Employee> findAllEmp(){
        return employeeRepo.findAll();
    }
//更新用户
    public Employee updateEmp(Employee employee){
        return employeeRepo.save(employee);
    }

```

我们的重点是通过id查询用户和通过Id删除用户，这会涉及两个要点问题，我们先看删除用户

1. 通过Id删除用户

   由于employee Repo中没有定义这个方法，我们需要自己定义，所以需要在repo接口类中去实现

   ```java
   void deleteEmployeeById(Long id);
   ```

   **这里需要注意的是，此处的方法是spring自动识别的，你需要完整的写出delete、Employee、By等等关键字，这是重要的接口，spring无法识别的话就无法帮你生成查询语句，会报错**

   然后在服务中写删除方法

   ```
   //删除用户
       public void delEmp(Long id){
           employeeRepo.delEmpById(id);
       }
   ```

   ==这是我们自定义方法的实现方式==

2. 通过Id查询用户

   首先这是一个自定义方法，所以步骤和上面的一样，其次，查询用户时可能会出现没有找到id对应用户的情况，如果这时候还是要返回employee对象，明显是有问题的。

   所以我们可以返回一个异常，在repo接口类中将方法修改为

   ```java
   Optional<Employee> findEmployeeById(Long id);
   ```

   > Optional 类是一个可以为null的容器对象。如果值存在则isPresent()方法会返回true，调用get()方法会返回该对象。
   >
   > Optional 是个容器：它可以保存类型T的值，或者仅仅保存null。Optional提供很多有用的方法，这样我们就不用显式进行空值检测
   >
   > Optional 类的引入很好的解决空指针异常。

   然后可以将方法写为

   ```java
   //通过id查找用户
       public Employee findEmployeeById(Long id){
           return employeeRepo.findEmployeeById(id)
                   .orElseThrow(() -> new UserNotFoundException("user by id " + id + " was not found."));
       }
   ```

   你可以看到我们新建了一个异常对象，`orElseThrow()`在前面的方法出现异常时会返回`UserNotFoundException`定义的信息`"user by id " + id + " was not found."`。

   为了使这个异常类可以使用，我们需要将异常类方法写一下，新建一个包exception，写如下类，需要继承`RuntimeException`

   ```
   public class UserNotFoundException extends RuntimeException{
       public UserNotFoundException(String s) {
           super(s);
       }
   }
   ```

   super(s)可以调用父类的有参方法把s这个字符串传进去

   ==这是我们处理异常的方式==

### 回顾api设计，创建controller



![image-20220421164623585](https://s2.loli.net/2022/04/21/7N6RshTckyH3W8G.png)

我们现在已经完成了数据库和服务的部分，现在需要controller来控制用户的操作

controller中不应该放置真正的逻辑代码，应该专注于接收请求，处理请求和返回请求







我们新建一个EmployeeResour.java

```java
package com.hengxing.employeemanager;

import com.hengxing.employeemanager.model.Employee;
import com.hengxing.employeemanager.service.EmployeeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * @projectName: employeemanager
 * @package: com.hengxing.employeemanager
 * @className: EmployeeResource
 * @author: HengxingStu
 * @description: 整个程序的控制器，专注于处理请求
 * @date: 4/21/2022 4:54 PM
 * @version: 1.0
 */
@RestController
@RequestMapping("/employee")
public class EmployeeResource {
    private final EmployeeService employeeService;

    public EmployeeResource(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    //返回所有用户
    @GetMapping("/all")
    public ResponseEntity<List<Employee>> getAllEmployees(){
        List<Employee> allEmp = employeeService.findAllEmp();
        return new ResponseEntity<>(allEmp, HttpStatus.OK);
    }

    //通过id返回用户
    @GetMapping("/find/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable("id") Long id){
        Employee employee = employeeService.findEmployeeById(id);
        return new ResponseEntity<>(employee, HttpStatus.OK);
    }

    //添加用户
    @PostMapping("/add")
    public ResponseEntity<Employee> addEmployee(@RequestBody Employee employee){
        Employee newEmployee = employeeService.addEmp(employee);
        return new ResponseEntity<>(newEmployee, HttpStatus.CREATED);
    }

    //更新用户
    @PutMapping("/update")
    public ResponseEntity<Employee> updateEmployee(@RequestBody Employee employee){
        Employee updateEmployee = employeeService.updateEmp(employee);
        return new ResponseEntity<>(updateEmployee, HttpStatus.OK);
    }

    //删除用户
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteEmployee(@PathVariable("id") Long id){
        employeeService.delEmp(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
```

我们来逐步拆解这些代码

首先，这个文件是整个程序的控制器，需要处理请求，所以我们需要告诉spring这是一个rest风格的controller，使用`@RestController`

`@RequestMapping("/employee")`告诉spring将`/employee`的请求发送给当前类或方法来处理，并且可以层层递进

由于在controller中我们需要使用服务，所以也需要对服务进行声明和注入`@RestController`

编写Mapping，每个mapping就对应一个api，我们可以使用如下的http方式

- `@GetMapping("/all")`

  通过get方法，这种方法只能接收零星的参数，接收参数时使用实例<通过id返回用户>方法中的方式，要注意的是，如下图所示的两个字段必须相同

  ![image-20220421170534313](https://s2.loli.net/2022/04/21/XTr7NKpcUSZGL1l.png)

- `@PostMapping("/add")`

  通过post方法，可以在requestbody中通过JSON等方式传递信息，使用方法是在controller的mapping方法参数中注解`@RequestBody`

- `@PutMapping("/update")`

  使用put方法，因为我们要修改数据库中的信息==这一部分存疑，我并不知道为何使用put，需要补习http协议的知识==

- `@DeleteMapping("/delete/{id}")`

  也是通过get方法，只不过会告诉spring这是一个删除操作，方法中也可以在`ResponseEntity<?>`直接写问号，因为你不必返回任何信息，只需要返回状态码就行

### 使用PostMan进行api调试

postman可以帮我们发送各种http请求，比浏览器方便多了，安装方法略，自己找吧，应用总在更新，每天的安装方式都不同

或者可以使用[http Pi](https://httpie.io/)，这是一个完全命令行的工具

#### 查询用户

如果我们使用get方法向`http://localhost:8080/employee/all`发送请求，可以得到回复`[]`，里面没有信息是因为你还没添加用户，不过你可以在你的调试窗口看到http的状态码

![image-20220421183904855](https://s2.loli.net/2022/04/21/aXvR6MoeCqiQlTf.png)

#### 添加用户

使用POST方式向`http://localhost:8080/employee/add`发送请求，并在Body中附带你要添加的用户信息

```json
{
  "email": "daniel@encrpt.com",
  "imageUrl": "https://www.bootdey.com/img/Content/avatar/avatar1.png",
  "jobTitle": "JavaScript",
  "name": "Daniel Craig",
  "phone": "1331497835"
}
```

你会得到以下回复

```
{
  "id": 1,
  "name": "Daniel Craig",
  "email": "daniel@encrpt.com",
  "jobTitle": "JavaScript",
  "phone": "1331497835",
  "imageUrl": "https://bootdey.com/img/Content/anatar/avatar1.png",
  "employeeCode": "a34c8fd0-e3d2-4b5c-837e-a123990f0be0"
}
```

#### 更新用户

使用put方法`http://localhost:8080/employee/update`进行修改

不过要上传完整信息

```json
{
        "id": 1,
        "name": "Daniel Craig",
        "email": "daniel@encrpt.com",
        "jobTitle": "JavaScript",
        "phone": "1331497835",
        "imageUrl": "https://bootdey.com/img/Content/avatar/avatar1.png",
        "employeeCode": "a34c8fd0-e3d2-4b5c-837e-a123990f0be0"
    }
```

例如这里我们修改了图片连接，你也可以自行修改更明显的地方



##### 报错

```shell
Exception in thread "main" org.hibernate.InstantiationException: No default constructor for entity:
```

这是以为你的实体类没有默认的构造方法，加上就好了，在本例中是这样的

`public Employee() {}`



## 前端部分-angular

### 前端设计

现在来看我们的前端部分的设计

![image-20220421192055948](https://s2.loli.net/2022/04/21/PkfTGUFuASDtCH8.png)

UI就是用户在页面看到的，UI会连接到一个component中，component又可以访问一个service，这个service就是我们访问后端的方法

关于Angular如何使用可以去看官网文档

首先需要Angular中创建一个Service，这是我们访问后端的http服务

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Employee } from './employee';

@Injectable({
  providedIn:'root'
})
export class EmployeeService {
  private apiServerUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  public getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiServerUrl}/employee/all`)
  }

  public addEmploye(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiServerUrl}/employee/add`,employee)
  }

  public updateEmploye(employee: Employee): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiServerUrl}/employee/update`,employee)
  }

  public deleteEmploye(employeeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiServerUrl}/employee/delete/${employeeId}`)
  }

}
```

`@Injectable`可以将服务作为依赖注入到组件中，更多关于此的内容请查看[angular依赖注入](https://angular.cn/guide/architecture-services)，下图是依赖注入的原理

![angular依赖注入](https://angular.cn/generated/images/guide/architecture/injector-injects.png)



你可以看到我们定义了访问api的各种请求，但这其中用到了一些实体类的内容，Angular并不能直接访问spring的内部类，所以我们需要在angular中创建一个镜像类

```typescript
export interface Employee{
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  imageUrl: string;
  employeeCode: string;
}
```

定义好了服务，你就可以在component中使用它，先在构造方法中注入服务

### 报错

`Uncaught Error: Type HttpClient does not have 'ɵmod' property`

stackOverflow的回答

1. Don't import HttpClient on app.module.ts
2. Don't import HttpClientModule in app.component.ts
3. Don't inject HttpClient directly in your app.component.ts, instead use a service.

This are 3 errors/bad practices I can see!

你可以查看这位回答者在下面给出了进一步的回答

> tutorial must be old,In angular we should import modules, i.e HttpClientModule.this will load all exported classes inside this particular module & after that you can just use HttpClient as a injected variable inside component/service constructor. Try creating module yourself to understand it better.

言下之意就是==应该引入HttpClientModule==这个模组而不是HttpClient这个模块

### 启动angular服务器

这时，你会发现你得到了一个错误`Access to XMLHttpRequest at 'http://localhost:8080/employee/all' from origin 'http://localhost:4200' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`

因为你的web服务器和后端服务器使用的是不同的域名，后端拒绝了你的访问，你可以查看[跨域资源分享文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)

为了解决跨域问题，你需要在后端中设置`CORS configuration`，在SpringBootApplication启动类中添加如下方法

```
@Bean
	public CorsFilter corsFilter(){
		CorsConfiguration corsConfiguration = new CorsConfiguration();
		corsConfiguration.setAllowCredentials(true);
		corsConfiguration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
		corsConfiguration.setAllowedHeaders(Arrays.asList("Origin", "Access-Control-Allow-Origin",
				"Content-Type","Accept", "Authorization", "Origin, Accept", "X-Requested-With",
				"Access-Control-Request-Method", "Access-Control-Request-Headers"));
		corsConfiguration.setExposedHeaders(Arrays.asList("Origin","Content-Type","Accept",
				"Authorization", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"));
		corsConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		UrlBasedCorsConfigurationSource urlBasedCorsConfigurationSource = new UrlBasedCorsConfigurationSource();
		urlBasedCorsConfigurationSource.registerCorsConfiguration("/**",corsConfiguration);
		return new CorsFilter(urlBasedCorsConfigurationSource);
	}
```

app.component.html

```html
<link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" rel="stylesheet">
<nav id="nav" class="navbar navbar-expand-lg navbar-dark bg-dark">
  <a class="navbar-brand" style="color: white;">Employee Manager</a>
  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarColor02" aria-controls="navbar">
  <span class="navbar-toggler-icon"></span>
  </button>
  <div class="collapse navbar-collapse" id="navbarColor02">
    <ul class="navbar-nav mr-auto">
        <li class="nav-item active">
            <a class="nav-link" data-toggle="modal" data-target="#exampleModal">Add Employee <span class="sr-only">(current)</span></a>
        </li>
    </ul>
    <form class="form-inline my-2 my-lg-0">
        <input type="search" name="key" id="searchName" class="form-control mr-sm-2" placeholder="Search employees.."/>
    </form>
  </div>
</nav>

<div class="container">
    <div class="row">
        <div *ngFor="let employee of employees" class="col-md-6 col-xl-3">
            <div class="card m-b-30">
                <div class="card-body row">
                    <div class="col-6">
                        <a href=""><img src="{{employee?.imageUrl}}" alt="" class="img-fluid rounded-circle w-60"></a>
                    </div>
                    <div class="col-6 card-title align-self-center mb-0">
                        <h5>Emma A. Main</h5>
                        <p class="m-0">Graphics Designer</p>
                    </div>
                </div>
                <ul class="list-group list-group-flush">
                    <li class="list-group-item"><i class="fa fa-envelope float-right"></i>Email : <a href="#">PaulGoyette@gmail.com</a></li>
                    <li class="list-group-item"><i class="fa fa-phone float-right"></i>Phone : 000 123-456</li>
                </ul>
                <div class="card-body">
                    <div class="float-right btn-group btn-group-sm">
                        <a href="#" class="btn btn-primary tooltips" data-placement="top" data-toggle="tooltip" data-original-title="Edit"><i class="fa fa-pencil"></i> </a>
                        <a href="#" class="btn btn-secondary tooltips" data-placement="top" data-toggle="tooltip" data-original-title="Delete"><i class="fa fa-times"></i></a>
                    </div>
                    <ul class="social-links list-inline mb-0">
                        <li class="list-inline-item"><a title="" data-placement="top" data-toggle="tooltip" class="tooltips" href="" data-original-title="Facebook"><i class="fa fa-facebook-f"></i></a></li>
                        <li class="list-inline-item"><a title="" data-placement="top" data-toggle="tooltip" class="tooltips" href="" data-original-title="Twitter"><i class="fa fa-twitter"></i></a></li>
                        <li class="list-inline-item"><a title="" data-placement="top" data-toggle="tooltip" class="tooltips" href="" data-original-title="Skype"><i class="fa fa-skype"></i></a></li>
                    </ul>
                </div>
            </div>
        </div>

    </div>
</div>
```

styless.css

```css
/* You can add global styles to this file, and also import other style files */

/* import Bootstrap*/
@import url('https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css');

body{
  margin-top: 0px;
  background: #f5f5f5;
}
.card {
  border: none;
  -webkit-box-shadow: 0 1px 2px 0 rgba(0,0,0,.05);
  box-shadow: 0 1px 2px 0 rgba(0,0,0,.05);
  margin-bottom: 30px;
}
.w-60 {
  width: 60px;
}
h1, h2, h3, h4, h5, h6 {
  margin: 0 0 10px;
  font-weight: 600;
}
.social-links li a {
  -webkit-border-radius: 50%;
  background-color: rgba(89,206,181,.85);
  border-radius: 50%;
  color: #fff;
  display: inline-block;
  height: 30px;
  line-height: 30px;
  text-align: center;
  width: 30px;
  font-size: 12px;
}
a {
  color: #707070;
}
```

其中，在引入employee的时候使用了`employee?.imageUrl`这个问号是为了防止服务器在emploee不存在时报错



现在介绍一种控制按钮展现页面的方法，通过统一的方法控制modal的展现

在按钮上通过`(click)="onOpenModal(null, 'add')"`，控制并调用对应的modal，当我们点击按钮，就会触发`onOpenModal`方法，同时传入需要的参数，参数有何作用稍候解释，我们来看方法的代码

```typescript
public onOpenModal(employee: Employee | null | undefined, mode: string): void {
    const container = document.getElementById('main-container')
    const button = document.createElement('button');
    button.type = 'button';
    button.style.display = 'none';
    button.setAttribute('data-toggle','modal');
    if (mode === 'add') {
    button.setAttribute('data-target','#addEmployeeModal');
    }
    if (mode === 'edit') {
      button.setAttribute('data-target','#updateEmployeeModal');
    }
    if (mode === 'delete') {
      button.setAttribute('data-target','#deleteEmployeeModal');
      }
    container?.appendChild(button);
    button.click();
  }
```

进入onOpenModal方法后，我们首先要做的是获取容器，通过Id找到了main-container，在这个容器中创建新的元素，我们这里创建的是button，为其附带了modal的参数，并且设置了不显示，通过我们传入的参数，我们可以通过id设置对应的`data-target`，指向各个modal。

最后一步就是通过在container中添加子元素，并点击，完成了业务逻辑。





在调试整个项目的逻辑时可以用开发者工具

![image-20220422185820205](https://s2.loli.net/2022/04/22/X1W5lnIP3hQMUJz.png)

### angular表单

若要使用angular的表单，在`app.module.ts`中引入

```typescript
import { FormsModule } from '@angular/forms';
imports: [
    FormsModule
  ]
```

引入表单后就可以直接使用

#### 添加员工组件

```html
<!-- Add Employee Modal -->
<div class="modal fade" id="addEmployeeModal" tabindex="-1" role="dialog" aria-labelledby="addEmployeeModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
       <div class="modal-header">
          <h5 class="modal-title" id="addEmployeeModalLabel">Add Employee</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
          </button>
       </div>
       <div class="modal-body">
          <form #addForm="ngForm" (ngSubmit)="onAddEmloyee(addForm)">

            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" ngModel name="name" class="form-control" id="name" placeholder="Name" required>
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" ngModel name="email" class="form-control" id="email" placeholder="Email" required>
            </div>
            <div class="form-group">
              <label for="phone">Job title</label>
              <input type="text" ngModel name="jobTitle" class="form-control" id="jobTile" placeholder="Job title" required>
            </div>
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="text" ngModel name="phone" class="form-control" id="phone" placeholder="Phone" required>
            </div>
            <div class="form-group">
              <label for="phone">Image URL</label>
              <input type="text" ngModel name="imageUrl" class="form-control" id="imageUrl" placeholder="Image URL" required>
            </div>
            <div class="modal-footer">
              <button type="button" id="add-employee-form" class="btn btn-secondary" data-dismiss="modal">Close</button>
              <button [disabled]="addForm.invalid" type="submit" class="btn btn-primary" >Save changes</button>
            </div>
          </form>
       </div>
    </div>
  </div>
  </div>
```

现在我们来解析其中的要点

**表单部分**

首先除去主要的html部分，我们要绑定form表单，所以在form标签为这个DOM对象起一个名字

` <form #addForm="ngForm" (ngSubmit)="onAddEmloyee(addForm)">`

这个ngForm，我并不明白它的意思，猜想应该是绑定了表单的类型，但我的html和js方面的知识不到家，并不了解

`(ngSubmit)`是绑定了方法，并将这个表单作为ngForm类型的数据传参

>  []表示绑定属性，()表示绑定事件，[()]表示双向绑定

其次，每个input中的name会被当做这个表单数据的key，所以一定要有，并为其添加`ngModel `样式

`<input type="text" ngModel name="name" class="form-control" id="name" placeholder="Name" required>`

最后，为提交按钮设置表单检查，如果表单未完成，则不能点击。使用属性绑定`[disabled]="addForm.invalid"`

```html
<button [disabled]="addForm.invalid" type="submit" class="btn btn-primary" >Save changes</button>
```

一旦我们点击提交，angular就会自动帮我们把表单数据作为参数传给`ngSubmit`绑定的函数

**逻辑部分**

**先空着**

#### 修改员工组件

我们这次从修改按钮先来看

在html部分我们可以看到，修改标签被我们写成这样

```html
<a (click)="onOpenModal(employee , 'edit')" href="#" class="btn btn-primary tooltips" data-placement="top" data-toggle="tooltip" data-original-title="Edit"><i class="fa fa-pencil"></i> </a>
```

其中的click绑定了onOpenModal方法，传入当前的employee和字符串edit。它会执行onOpenModal方法（这里我们由于传入了新的员工数据，所以需要创建一个新的对象，所以进行了更新），进而执行`onUpdateEmloyee`

```typescript
public editEmployee: Employee | null | undefined;
```
```typescript
if (mode === 'edit') {
    this.editEmployee = employee;//将接收到的参数赋值给要修改的新对象 
    button.setAttribute('data-target','#updateEmployeeModal');
}
container?.appendChild(button);
button.click();
```

```typescript
  /**
   * onUpdateEmloyee
   * 修改用户信息的方法
   */
   public onUpdateEmloyee(employee: Employee): void {
    //employeeService调用updateEmploye方法，这里就已经修改了，然后我们再调用subscribe重新获取用户
    this.employeeService.updateEmploye(employee).subscribe(
      (response: Employee) => {
        console.log(response);
        this.getEmployees();
      },
      (error: HttpErrorResponse) => {alert(error.message)}
    )
  }
```

调用`employeeService`的`getEmployees`方法重新获取用户信息（相当于刷新界面）




```typescript
public getEmployees(): void {
    this.employeeService.getEmployees().subscribe(
      (response: Employee[]) => {
        console.log(response)
        this.employees = response;
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    )
  }
```

这便是我们完整的业务逻辑

现在需要在html中写出Edit Modal

```html
<!-- Edit Modal -->
<div class="modal fade" id="updateEmployeeModal" tabindex="-1" role="dialog" aria-labelledby="employeeEditModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
     <div class="modal-content">
        <div class="modal-header">
          <div *ngIf="employees?.length == 0" class="col-lg-12 col-md-12 col-xl-12">
           <h5 class="modal-title" id="updateEmployeeModalLabel">Edit Employee {{editEmployee?.name}}</h5>
           <button type="button" class="close" data-dismiss="modal" aria-label="Close">
           <span aria-hidden="true">&times;</span>
           </button>
          </div>
          <div class="modal-body">
            <form #editForm="ngForm">
                <div class="form-group">
                  <label for="name">Name</label>
                  <input type="text" ngModel="{{editEmployee?.name}}" name="name" class="form-control" id="name" aria-describedby="emailHelp" placeholder="Name">
                </div>
                <!-- 这里隐藏着id和employeeCode -->
                <input type="hidden" ngModel="{{editEmployee?.id}}" name="id" class="form-control" id="id" placeholder="Email">
                <input type="hidden" ngModel="{{editEmployee?.employeeCode}}" name="userCode" class="form-control" id="userCode" placeholder="Email">
                <div class="form-group">
                  <label for="email">Email Address</label>
                  <input type="email" ngModel="{{editEmployee?.email}}" name="email" class="form-control" id="email" placeholder="Email">
                </div>
                <div class="form-group">
                  <label for="phone">Job title</label>
                  <input type="text" ngModel="{{editEmployee?.jobTitle}}" name="jobTitle" class="form-control" id="jobTitle" placeholder="Job title">
                </div>
                <div class="form-group">
                  <label for="phone">Phone</label>
                  <input type="text" ngModel="{{editEmployee?.phone}}" name="phone" class="form-control" id="phone" name="phone" placeholder="Phone">
                </div>
                <div class="form-group">
                  <label for="phone">Image URL</label>
                  <input type="text" ngModel="{{editEmployee?.imageUrl}}" name="imageUrl" class="form-control" id="imageUrl" placeholder="Image URL">
                </div>
                <div class="modal-footer">
                  <button type="button" id="" data-dismiss="modal" class="btn btn-secondary">Close</button>
                  <button (click)="onUpdateEmloyee(editForm.value)" data-dismiss="modal" class="btn btn-primary" >Save changes</button>
                </div>
            </form>
          </div>
        </div>
    </div>
  </div>
</div>
```

我们一一介绍

首先是如何绑定表单，还是在`<form>标签`中写入`#editForm="ngForm"`这样就将此表单声明为一个名为editForm的ngForm组件，其次在提交按钮绑定事件，调用更新方法，传入`editForm.value`

其次，这里使用的是`editEmployee`这是在onOpenModal传入的参数，也就是我们要修改的对象。

你还可以看到id和employeeCode，但我们对他进行了隐藏，因为我们不希望用户修改这些信息，不过我们还是需要这些信息，因为我们如果没有id和employeeCode，我们的服务器就会误认为这是一个新的用户，为他分配新的id。

**Tips：清楚表单里的数据**

添加一个用户之后，再次点击添加，你会看到上一次添加的用户信息依然存在，解决这个问题，只需要在onAddEmloyee方法中（完成业务逻辑后）添加如下代码，就可以清空

```typescript
addForm.reset();
```

#### 删除员工组件

有了前两个的经验，第三个就容易多了。

首先我们知道当点击删除按钮时，会通过`onOpenModal`引导到`deleteEmployeeModal`的模组中

```html
<!-- Delete Modal -->
<div class="modal fade" id="deleteEmployeeModal" tabindex="-1" role="dialog" aria-labelledby="deleteModelLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
     <div class="modal-content">
        <div class="modal-header">
           <h5 class="modal-title" id="deleteModelLabel">Delete Employee</h5>
           <button type="button" class="close" data-dismiss="modal" aria-label="Close">
           <span aria-hidden="true">&times;</span>
           </button>
        </div>
        <div class="modal-body">
           <p>Are you sure you want to delete employee {{deleteEmployee?.name}}?</p>
           <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">No</button>
              <button (click)="onDeleteEmloyee(deleteEmployee?.id)" class="btn btn-danger" data-dismiss="modal">Yes</button>
           </div>
        </div>
     </div>
  </div>
</div>
```

这个modal中的按钮和onDeleteEmloyee方法绑定了，同时，我们需要将当前的用户的id传给删除的方法，这就需要我们再创建一个对象deleteEmployee

```typescript
public deleteEmployee: Employee | null | undefined;
```

接收用户的id，调用deleteEmployee

```typescript
/**
   * onDeleteEmloyee
   * 删除用户信息的方法
   */
   public onDeleteEmloyee(employeeId: number | undefined): void {
    //employeeService调用updateEmploye方法，这里就已经修改了，然后我们再调用subscribe重新获取这个用户
    this.employeeService.deleteEmploye(employeeId).subscribe(
      (response: void) => {
        console.log(response);
        this.getEmployees();
      },
      (error: HttpErrorResponse) => {alert(error.message)}
    )
  }
```

#### 没有员工时的提示

使用ngIf对数组长度进行判断，如果为零就显示

```
<!-- Notification for no employees -->
<div *ngIf="employees?.length == 0" class="col-lg-12 col-md-12 col-xl-12">
  <div class="alert alert-info" role="alert">
    <h4 class="alert-heading">NO EMPLOYEES!</h4>
    <p>No Employees were found.</p>
  </div>
</div>
```

#### 纯前端的简单搜索组件



# 总结



## 完整的表单

通过ngsubmit来提交，可以提交

```html
<form #registerForm="ngForm" (ngSubmit)="register(registerForm)">
              <div class="form-group">
                <label>UserName</label>
                <input ngModel name="username" id="username" class="form-control form-control-lg" type="text" placeholder="Enter your username" required >
              </div>
              <div class="form-group">
                <label>Password</label>
                <input ngModel name="password" id="password" class="form-control form-control-lg" type="password" placeholder="Enter your password" required>
              </div>
              <div class="form-group">
                <label>Confirm Password Again</label>
                <input ngModel name="passwordAgain" id="passwordAgain" class="form-control form-control-lg" type="password" placeholder="Confirm your password again" required>
              </div>
              <div class="form-group">
                <label>NickName</label>
                <input ngModel name="nickname" id="nickname"  class="form-control form-control-lg" type="text" placeholder="Enter your nickname">
              </div>
              <div class="text-center mt-3">
                <button [disabled]="registerForm.invalid" type="submit" class="btn btn-lg btn-primary">Sign up</button>
              </div>
            </form>
```



```typescript
 user = new User;

 constructor(private loginService:LoginService) { }

public register(form: NgForm){
    console.log(form.value)
    if(form.value.password == form.value.passwordAgain){
      this.user.username = form.value.username
      this.user.password = form.value.password
      this.loginService.register(this.user)
    }
    else{
      alert("验证失败，请检查两次密码的拼写")
    }

```

